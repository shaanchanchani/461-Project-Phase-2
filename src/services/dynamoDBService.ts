// src/services/dynamoDBService.ts
import { 
    CreateTableCommand,
    CreateTableCommandInput,
    UpdateContinuousBackupsCommand,
    waitUntilTableExists,
    DynamoDBClient,
    ScalarAttributeType,
    KeyType,
    BillingMode
} from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    QueryCommand,
    GetCommand,
    UpdateCommand,
    DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import { createHash } from 'crypto';
import { Package, PackageID, DB } from '../types';
import { log } from '../logger';
import { TABLE_NAME, createDynamoDBClients } from '../config/aws';

export class DynamoDBService {
    private readonly docClient: DynamoDBDocumentClient;
    private readonly baseClient: DynamoDBClient;

    constructor() {
        const { baseClient, documentClient } = createDynamoDBClients();
        this.baseClient = baseClient;
        this.docClient = documentClient;
    }

    private generatePackageID(name: string, version: string): PackageID {
        const hash = createHash('sha256');
        hash.update(`${name}-${version}`);
        return hash.digest('hex').substring(0, 16);
    }

    async createTable(): Promise<void> {
        const params: CreateTableCommandInput = {
            TableName: TABLE_NAME,
            AttributeDefinitions: [
                { AttributeName: 'PK', AttributeType: ScalarAttributeType.S },
                { AttributeName: 'SK', AttributeType: ScalarAttributeType.S }
            ],
            KeySchema: [
                { AttributeName: 'PK', KeyType: KeyType.HASH },
                { AttributeName: 'SK', KeyType: KeyType.RANGE }
            ],
            BillingMode: BillingMode.PAY_PER_REQUEST
        };

        try {
            await this.baseClient.send(new CreateTableCommand(params));
            log.info(`Created table ${TABLE_NAME}`);

            await waitUntilTableExists(
                { client: this.baseClient, maxWaitTime: 300 },
                { TableName: TABLE_NAME }
            );

            await this.baseClient.send(new UpdateContinuousBackupsCommand({
                TableName: TABLE_NAME,
                PointInTimeRecoverySpecification: {
                    PointInTimeRecoveryEnabled: true
                }
            }));

            log.info('Table setup completed with point-in-time recovery enabled');
        } catch (error) {
            if (error instanceof Error && error.name === 'ResourceInUseException') {
                log.info(`Table ${TABLE_NAME} already exists`);
                return;
            }
            log.error('Error creating table:', error);
            throw error;
        }
    }

    async createPackage(pkg: Package): Promise<Package> {
        if (!pkg.metadata.ID) {
            pkg.metadata.ID = this.generatePackageID(pkg.metadata.Name, pkg.metadata.Version);
        }

        const item: DB.DynamoPackageItem = {
            PK: `PKG#${pkg.metadata.ID}`,
            SK: `METADATA#${pkg.metadata.Version}`,
            type: 'package',
            metadata: pkg.metadata,
            data: pkg.data,
            createdAt: new Date().toISOString()
        };

        try {
            await this.docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: item,
                ConditionExpression: 'attribute_not_exists(PK)',
            }));

            log.info(`Created package ${pkg.metadata.Name} v${pkg.metadata.Version}`);
            return pkg;
        } catch (error) {
            if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
                throw new Error(`Package ${pkg.metadata.Name} v${pkg.metadata.Version} already exists`);
            }
            log.error('Error creating package:', error);
            throw error;
        }
    }

    async getPackage(id: PackageID, version?: string): Promise<Package | null> {
        try {
            if (version) {
                const result = await this.docClient.send(new GetCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `PKG#${id}`,
                        SK: `METADATA#${version}`
                    }
                }));
                
                return result.Item ? DB.toAPIPackage(result.Item as DB.DynamoPackageItem) : null;
            }

            const result = await this.docClient.send(new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues: {
                    ':pk': `PKG#${id}`,
                    ':sk': 'METADATA#'
                },
                Limit: 1,
                ScanIndexForward: false // Get latest version
            }));

            if (!result.Items?.length) return null;
            return DB.toAPIPackage(result.Items[0] as DB.DynamoPackageItem);
        } catch (error) {
            log.error('Error retrieving package:', error);
            throw error;
        }
    }
}

export const dynamoDBService = new DynamoDBService();