// src/services/dynamoDBService.ts
import * as AWS from 'aws-sdk';
import { DynamoDB } from 'aws-sdk';
import { Package, PackageID, DB } from '../types';
import { createHash } from 'crypto';
import { log } from '../logger';
import { configureAWS, TABLE_NAME } from '../config/aws';

export class DynamoDBService {
    private dynamoDB: DynamoDB.DocumentClient;

    constructor() {
        this.dynamoDB = configureAWS();
    }

    /**
     * Creates the DynamoDB table in production
     */
    async createTable(): Promise<void> {
        const dynamoDB = new DynamoDB({ region: process.env.AWS_REGION });
        
        const params: DynamoDB.CreateTableInput = {
            TableName: TABLE_NAME,
            AttributeDefinitions: [
                { AttributeName: 'PK', AttributeType: 'S' },
                { AttributeName: 'SK', AttributeType: 'S' },
                { AttributeName: 'GSI1PK', AttributeType: 'S' },
                { AttributeName: 'GSI1SK', AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'PK', KeyType: 'HASH' },
                { AttributeName: 'SK', KeyType: 'RANGE' }
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'GSI1',
                    KeySchema: [
                        { AttributeName: 'GSI1PK', KeyType: 'HASH' },
                        { AttributeName: 'GSI1SK', KeyType: 'RANGE' }
                    ],
                    Projection: {
                        ProjectionType: 'ALL'
                    },
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 5,
                        WriteCapacityUnits: 5
                    }
                }
            ],
            BillingMode: 'PAY_PER_REQUEST', // Better for production - no need to manage capacity
            Tags: [
                {
                    Key: 'Environment',
                    Value: 'Production'
                },
                {
                    Key: 'Project',
                    Value: 'PackageRegistry'
                }
            ]
        };

        try {
            await dynamoDB.createTable(params).promise();
            log.info(`Created table ${TABLE_NAME}`);
            
            // Wait for table to be active
            await dynamoDB.waitFor('tableExists', { TableName: TABLE_NAME }).promise();
            
            // Enable point-in-time recovery for production
            await dynamoDB.updateContinuousBackups({
                TableName: TABLE_NAME,
                PointInTimeRecoverySpecification: {
                    PointInTimeRecoveryEnabled: true
                }
            }).promise();
            
            log.info('Enabled point-in-time recovery for table');
        } catch (error: any) {
            if (error.code === 'ResourceInUseException') {
                log.info(`Table ${TABLE_NAME} already exists`);
            } else {
                log.error('Error creating table:', error);
                throw error;
            }
        }
    }

    /**
     * Generates a deterministic package ID
     */
    private generatePackageID(name: string, version: string): PackageID {
        const hash = createHash('sha256');
        hash.update(`${name}-${version}`);
        return hash.digest('hex').substring(0, 16);
    }

    /**
     * Creates a new package with error handling and retries
     */
    async createPackage(pkg: Package): Promise<Package> {
        // Generate ID if not provided
        if (!pkg.metadata.ID) {
            pkg.metadata.ID = this.generatePackageID(pkg.metadata.Name, pkg.metadata.Version);
        }

        const item: DB.DynamoPackageItem & { GSI1PK: string; GSI1SK: string } = {
            PK: `PKG#${pkg.metadata.ID}`,
            SK: `METADATA#${pkg.metadata.Version}`,
            GSI1PK: `NAME#${pkg.metadata.Name}`,
            GSI1SK: `VERSION#${pkg.metadata.Version}`,
            type: 'package',
            metadata: pkg.metadata,
            data: pkg.data,
            createdAt: new Date().toISOString()
        };

        let retries = 3;
        while (retries > 0) {
            try {
                await this.dynamoDB.put({
                    TableName: TABLE_NAME,
                    Item: item,
                    ConditionExpression: 'attribute_not_exists(PK)',
                }).promise();

                log.info(`Successfully created package ${pkg.metadata.Name} v${pkg.metadata.Version}`);
                return pkg;
            } catch (error: any) {
                if (error.code === 'ConditionalCheckFailedException') {
                    throw new Error('Package already exists');
                }
                
                if (error.code === 'ProvisionedThroughputExceededException' && retries > 1) {
                    // Exponential backoff
                    const delay = Math.pow(2, 4 - retries) * 100;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries--;
                    continue;
                }
                
                log.error('Error creating package:', error);
                throw error;
            }
        }

        throw new Error('Failed to create package after retries');
    }

    /**
     * Retrieves a package by ID with error handling
     */
    async getPackage(id: PackageID): Promise<Package | null> {
        try {
            const result = await this.dynamoDB.query({
                TableName: TABLE_NAME,
                KeyConditionExpression: 'PK = :pk',
                ExpressionAttributeValues: {
                    ':pk': `PKG#${id}`
                }
            }).promise();

            if (!result.Items || result.Items.length === 0) {
                return null;
            }

            const item = result.Items[0] as DB.DynamoPackageItem;
            return DB.toAPIPackage(item);
        } catch (error: any) {
            log.error('Error retrieving package:', error);
            throw error;
        }
    }
}

export const dynamoDBService = new DynamoDBService();