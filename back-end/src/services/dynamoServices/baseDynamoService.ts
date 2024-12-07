import { 
    DynamoDBClient,
    ScanCommand,
    BatchWriteItemCommand
} from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    QueryCommand,
    GetCommand,
    UpdateCommand,
    DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import { log } from '../../logger';
import { DynamoItem } from '../../types';

export class BaseDynamoService {
    protected baseClient: DynamoDBClient;
    protected docClient: DynamoDBDocumentClient;

    constructor() {
        const config = {
            region: process.env.AWS_REGION || 'local',
            endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local'
            }
        };

        this.baseClient = new DynamoDBClient(config);
        this.docClient = DynamoDBDocumentClient.from(this.baseClient, {
            marshallOptions: {
                removeUndefinedValues: true,
            }
        });
    }

    /**
     * Generic method to put an item into a DynamoDB table
     */
    protected async put<T extends keyof DynamoItem>(tableName: string, item: DynamoItem[T]): Promise<void> {
        try {
            await this.docClient.send(new PutCommand({
                TableName: tableName,
                Item: item
            }));
            log.info(`Successfully put item in ${tableName}`);
        } catch (error) {
            log.error(`Error putting item in ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Clear all items from a DynamoDB table using batch operations
     */
    protected async clearTable(tableName: string): Promise<void> {
        try {
            const scanCommand = new ScanCommand({
                TableName: tableName,
                Limit: 1
            });

            try {
                const initialScan = await this.baseClient.send(scanCommand);
                if (!initialScan.Items || initialScan.Items.length === 0) {
                    log.info(`Table ${tableName} is already empty`);
                    return;
                }
            } catch (error: any) {
                if (error.name === 'ResourceNotFoundException') {
                    log.info(`Table ${tableName} does not exist`);
                    return;
                }
                throw error;
            }

            let lastEvaluatedKey: Record<string, any> | undefined;
            let totalDeleted = 0;
            
            do {
                const scanParams: any = {
                    TableName: tableName,
                    ExclusiveStartKey: lastEvaluatedKey,
                };

                const scanResult = await this.baseClient.send(new ScanCommand(scanParams));
                
                if (!scanResult.Items || scanResult.Items.length === 0) {
                    break;
                }

                for (let i = 0; i < scanResult.Items.length; i += 25) {
                    const batch = scanResult.Items.slice(i, i + 25);
                    const deleteRequests = batch.map(item => ({
                        DeleteRequest: {
                            Key: this.extractKeyFromItem(tableName, item)
                        }
                    }));

                    try {
                        await this.baseClient.send(new BatchWriteItemCommand({
                            RequestItems: {
                                [tableName]: deleteRequests
                            }
                        }));
                        totalDeleted += batch.length;
                    } catch (error: any) {
                        if (error.name === 'ResourceNotFoundException') {
                            log.info(`Table ${tableName} was deleted during cleanup`);
                            return;
                        }
                        throw error;
                    }
                }

                lastEvaluatedKey = scanResult.LastEvaluatedKey;
            } while (lastEvaluatedKey);

            log.info(`Successfully cleared table ${tableName} (${totalDeleted} items deleted)`);
        } catch (error) {
            log.error(`Error clearing table ${tableName}:`, error);
            throw error;
        }
    }

    /**
     * Clear all items from a table
     */
    public async clearAllTables(): Promise<void> {
        try {
            const tables = [
                process.env.DYNAMODB_PACKAGES_TABLE || 'Packages',
                process.env.DYNAMODB_PACKAGE_VERSIONS_TABLE || 'PackageVersions',
                process.env.DYNAMODB_PACKAGE_METRICS_TABLE || 'PackageMetrics',
                process.env.DYNAMODB_DOWNLOADS_TABLE || 'Downloads'
            ];

            for (const tableName of tables) {
                try {
                    // Get all items from the table
                    const scanCommand = new ScanCommand({
                        TableName: tableName
                    });

                    const items = await this.baseClient.send(scanCommand);
                    
                    if (items.Items && items.Items.length > 0) {
                        // Delete items in batches of 25 (DynamoDB limit)
                        const batches = [];
                        for (let i = 0; i < items.Items.length; i += 25) {
                            const batchItems = items.Items.slice(i, i + 25);
                            const deleteRequests = batchItems.map(item => {
                                try {
                                    const key = this.extractKeyFromItem(tableName, item);
                                    // Only include delete request if we got a valid key
                                    if (key && Object.keys(key).length > 0) {
                                        return {
                                            DeleteRequest: { Key: key }
                                        };
                                    }
                                    return null;
                                } catch (error) {
                                    log.warn(`Error extracting key for item in ${tableName}, skipping item`);
                                    return null;
                                }
                            }).filter(request => request !== null);

                            if (deleteRequests.length > 0) {
                                const batchWriteCommand = new BatchWriteItemCommand({
                                    RequestItems: {
                                        [tableName]: deleteRequests
                                    }
                                });
                                batches.push(this.baseClient.send(batchWriteCommand));
                            }
                        }

                        if (batches.length > 0) {
                            await Promise.all(batches);
                            log.info(`Cleared ${items.Items.length} items from ${tableName}`);
                        }
                    } else {
                        log.info(`Table ${tableName} is already empty`);
                    }
                } catch (error: any) {
                    if (error.name === 'ResourceNotFoundException') {
                        log.info(`Table ${tableName} does not exist, skipping`);
                        continue;
                    }
                    throw error;
                }
            }

            log.info('Successfully cleared all tables');
        } catch (error) {
            log.error('Error clearing tables:', error);
            throw error;
        }
    }

    protected extractKeyFromItem(tableName: string, item: Record<string, any>): Record<string, any> {
        // This method should be implemented by child classes
        throw new Error('Method not implemented');
    }
}
