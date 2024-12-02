// src/services/dynamoDBService.ts
import { 
    CreateTableCommand,
    CreateTableCommandInput,
    DynamoDBClient,
    ScalarAttributeType,
    KeyType,
    BillingMode,
    ListTablesCommand,
    DescribeTableCommand
} from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    QueryCommand,
    GetCommand
} from "@aws-sdk/lib-dynamodb";
import { createHash } from 'crypto';
import { Package, PackageID, DB, PackageRating, PackageMetadata, PackageData } from '../types';
import { log } from '../logger';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'packages';

export class DynamoDBService {
    private readonly docClient: DynamoDBDocumentClient;
    private readonly baseClient: DynamoDBClient;

    constructor() {
        // Configure the DynamoDB client for local development
        const config = {
            region: 'local',
            endpoint: 'http://localhost:8000',
            credentials: {
                accessKeyId: 'local',
                secretAccessKey: 'local'
            }
        };

        this.baseClient = new DynamoDBClient(config);
        this.docClient = DynamoDBDocumentClient.from(this.baseClient, {
            marshallOptions: {
                removeUndefinedValues: true,
            }
        });
    }

    private generatePackageID(name: string, version: string): PackageID {
        const hash = createHash('sha256');
        hash.update(`${name}-${version}`);
        return hash.digest('hex').substring(0, 16);
    }

    async listTables(): Promise<string[]> {
        try {
            const command = new ListTablesCommand({});
            const response = await this.baseClient.send(command);
            return response.TableNames || [];
        } catch (error) {
            log.error('Error listing tables:', error);
            throw error;
        }
    }

    async tableExists(tableName: string): Promise<boolean> {
        try {
            await this.baseClient.send(new DescribeTableCommand({ TableName: tableName }));
            return true;
        } catch (error: any) {
            if (error.name === 'ResourceNotFoundException') {
                return false;
            }
            throw error;
        }
    }

    async createTable(): Promise<void> {
        try {
            // Check if table already exists
            const exists = await this.tableExists(TABLE_NAME);
            if (exists) {
                log.info(`Table ${TABLE_NAME} already exists`);
                return;
            }

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

            await this.baseClient.send(new CreateTableCommand(params));
            log.info(`Created table ${TABLE_NAME}`);

            // Wait for table to be active
            let tableActive = false;
            while (!tableActive) {
                const response = await this.baseClient.send(
                    new DescribeTableCommand({ TableName: TABLE_NAME })
                );
                tableActive = response.Table?.TableStatus === 'ACTIVE';
                if (!tableActive) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            log.info('Table is now active');
        } catch (error) {
            log.error('Error creating table:', error);
            throw error;
        }
    }

    async createPackage(pkg: Package): Promise<Package> {
        try {
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

            await this.docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: item,
                ConditionExpression: 'attribute_not_exists(PK)'
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

    async getPackage(idOrName: string, version?: string): Promise<Package | null> {
        try {
            // If version is provided, try to get specific version
            if (version) {
                const result = await this.docClient.send(new GetCommand({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: `PKG#${idOrName}`,
                        SK: `METADATA#${version}`
                    }
                }));
                
                return result.Item ? DB.toAPIPackage(result.Item as DB.DynamoPackageItem) : null;
            }

            // Try to get by ID first
            const resultById = await this.docClient.send(new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues: {
                    ':pk': `PKG#${idOrName}`,
                    ':sk': 'METADATA#'
                },
                Limit: 1,
                ScanIndexForward: false // Get the latest version first
            }));

            if (resultById.Items?.length) {
                return DB.toAPIPackage(resultById.Items[0] as DB.DynamoPackageItem);
            }

            // If not found by ID, try to find by name using a query
            const resultByName = await this.docClient.send(new QueryCommand({
                TableName: TABLE_NAME,
                FilterExpression: 'metadata.Name = :name',
                ExpressionAttributeValues: {
                    ':name': idOrName
                },
                Limit: 1
            }));

            if (resultByName.Items?.length) {
                return DB.toAPIPackage(resultByName.Items[0] as DB.DynamoPackageItem);
            }

            return null;
        } catch (error) {
            log.error('Error retrieving package:', error);
            throw error;
        }
    }

    async updatePackageRating(id: PackageID, rating: PackageRating): Promise<void> {
        try {
            const item: DB.DynamoRatingItem = {
                PK: `PKG#${id}`,
                SK: 'RATING',
                type: 'rating',
                rating,
                updatedAt: new Date().toISOString()
            };

            await this.docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: item
            }));

            log.info(`Updated rating for package ${id}`);
        } catch (error) {
            log.error('Error updating package rating:', error);
            throw error;
        }
    }

    async listPackages(offset?: string): Promise<PackageMetadata[]> {
        try {
            const command = new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: {
                    ':pk': 'PACKAGE'
                },
                ExclusiveStartKey: offset ? JSON.parse(offset) : undefined,
                Limit: 10 // Limit results per page
            });

            const response = await this.docClient.send(command);
            return (response.Items || []).map(item => ({
                Name: item.Name,
                Version: item.Version,
                ID: item.ID
            }));
        } catch (error) {
            log.error('Error listing packages from DynamoDB:', error);
            throw error;
        }
    }
}

export const dynamoDBService = new DynamoDBService();