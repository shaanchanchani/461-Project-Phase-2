import { 
    CreateTableCommand,
    CreateTableCommandInput,
    DynamoDBClient,
    ScalarAttributeType,
    KeyType,
    BillingMode,
    ListTablesCommand,
    DescribeTableCommand,
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
    DeleteItemCommand,
    ScanCommand,
    BatchWriteItemCommand
} from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    QueryCommand as QueryCommandDoc,
    GetCommand,
    UpdateCommand,
    DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import { createHash } from 'crypto';
import { 
    Package, 
    PackageID, 
    PackageTableItem,
    PackageVersionTableItem,
    PackageMetricsTableItem,
    DownloadTableItem,
    UserTableItem,
    UserGroupTableItem,
    DynamoItem
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../logger';

const PACKAGES_TABLE = 'Packages';
const PACKAGE_VERSIONS_TABLE = 'PackageVersions';
const PACKAGE_METRICS_TABLE =  'PackageMetrics';
const DOWNLOADS_TABLE = 'Downloads';
const USERS_TABLE = 'Users';
const USER_GROUPS_TABLE = 'UserGroups';

/**
 * DynamoDB Service
 * 
 * A service class that handles all DynamoDB operations for the package registry.
 * This includes operations for:
 * - User management (creation, retrieval, authentication)
 * - User group management
 * - Package management (creation, versioning, retrieval)
 * - Package metrics tracking
 * - Download tracking
 * - Database maintenance (clearing tables, resetting state)
 * 
 * The service uses the AWS SDK v3 for DynamoDB and supports both standard DynamoDB
 * and local DynamoDB for development.
 */
export class DynamoDBService {
    private readonly docClient: DynamoDBDocumentClient;
    private readonly baseClient: DynamoDBClient;

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
     * @template T - The type of item being put into the table
     * @param tableName - Name of the DynamoDB table
     * @param item - The item to put into the table
     * @throws Error if the put operation fails
     */
    async put<T extends keyof DynamoItem>(tableName: string, item: DynamoItem[T]): Promise<void> {
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
     * Creates a new user in the system
     * @param username - Unique username for the new user
     * @param password - User's password (will be hashed before storage)
     * @param role - User's role in the system
     * @throws Error if username already exists or creation fails
     */
    async createUser(username: string, password: string, role: 'admin' | 'uploader' | 'downloader'): Promise<void> {
        try {
            // Check if username already exists
            const existingUser = await this.getUserByUsername(username);
            if (existingUser) {
                throw new Error(`Username ${username} already exists`);
            }
    
            const userData: UserTableItem = {
                user_id: uuidv4(),
                username,
                password_hash: this.hashPassword(password),
                role,
                created_at: new Date().toISOString()
            };
    
            await this.put<'UserTableItem'>(USERS_TABLE, userData);
            log.info(`Successfully created user ${username}`);
        } catch (error) {
            log.error('Error creating user:', error);
            throw error;
        }
    }
    /**
     * Hashes a password using SHA-256
     * @param password - Plain text password to hash
     * @returns Hashed password
     * @private
     */
    private hashPassword(password: string): string {
        return createHash('sha256').update(password).digest('hex');
    }
    /**
     * Creates an admin user with elevated privileges
     * @param username - Username for the admin
     * @param password - Admin's password (will be hashed)
     * @throws Error if creation fails
     */
    async createAdminUser(username: string, password: string): Promise<void> {
        try {
            await this.createUser(username, password, 'admin');
            log.info(`Successfully created admin user ${username}`);
        } catch (error) {
            log.error('Error creating admin user:', error);
            throw error;
        }
    }
    
    /**
     * Retrieves a user by their username
     * @param username - Username to search for
     * @returns User data if found, null otherwise
     */
    async getUserByUsername(username: string): Promise<UserTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommandDoc({
                TableName: USERS_TABLE,
                IndexName: 'username-index',
                KeyConditionExpression: 'username = :username',
                ExpressionAttributeValues: {
                    ':username': username
                }
            }));

            return result.Items?.[0] as UserTableItem || null;
        } catch (error) {
            log.error('Error getting user by username:', error);
            throw error;
        }
    }
    /**
     * Retrieves a user by their username
     * @param username - Username to search for
     * @returns User data if found, null otherwise
     */
    async getUserById(userId: string): Promise<UserTableItem | null> {
        try {
            const result = await this.docClient.send(new GetCommand({
                TableName: USERS_TABLE,
                Key: {
                    user_id: userId
                }
            }));

            return result.Item as UserTableItem || null;
        } catch (error) {
            log.error('Error getting user by ID:', error);
            throw error;
        }
    }
   // Update group creation to match user creation pattern
async createGroup(groupName: string): Promise<void> {
    try {
        // Check if group already exists
        const existingGroup = await this.getGroupByName(groupName);
        if (existingGroup) {
            throw new Error(`Group ${groupName} already exists`);
        }

        const groupData: UserGroupTableItem = {
            group_id: uuidv4(),
            group_name: groupName
        };

        await this.put<'UserGroupTableItem'>(USER_GROUPS_TABLE, groupData);
        log.info(`Successfully created group ${groupName}`);
    } catch (error) {
        log.error('Error creating group:', error);
        throw error;
    }
}

/**
 * Get a group by its ID
 * @param groupId UUID of the group
 */
async getGroupById(groupId: string): Promise<UserGroupTableItem | null> {
    try {
        const result = await this.docClient.send(new GetCommand({
            TableName: USER_GROUPS_TABLE,
            Key: {
                group_id: groupId
            }
        }));

        return result.Item as UserGroupTableItem || null;
    } catch (error) {
        log.error('Error getting group by ID:', error);
        throw error;
    }
}

/**
 * Add a user to a group
 * @param userId UUID of the user
 * @param groupId UUID of the group
 */
async addUserToGroup(userId: string, groupId: string): Promise<void> {
    try {
        // Verify both user and group exist
        const user = await this.getUserById(userId);
        const group = await this.getGroupById(groupId);

        if (!user) {
            throw new Error(`User ${userId} does not exist`);
        }
        if (!group) {
            throw new Error(`Group ${groupId} does not exist`);
        }

        // Update user with group ID
        const params = {
            TableName: USERS_TABLE,
            Key: {
                user_id: userId
            },
            UpdateExpression: 'SET group_id = :groupId',
            ExpressionAttributeValues: {
                ':groupId': groupId
            }
        };

        await this.docClient.send(new UpdateCommand(params));
        log.info(`Successfully added user ${userId} to group ${groupId}`);
    } catch (error) {
        log.error('Error adding user to group:', error);
        throw error;
    }
}

    /**
     * Remove a user from their group
     * @param userId UUID of the user
     */
    async removeUserFromGroup(userId: string): Promise<void> {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error(`User ${userId} does not exist`);
            }

            if (!user.group_id) {
                log.info(`User ${userId} is not in any group`);
                return;
            }

            const params = {
                TableName: USERS_TABLE,
                Key: {
                    user_id: userId
                },
                UpdateExpression: 'REMOVE group_id'
            };

            await this.docClient.send(new UpdateCommand(params));
            log.info(`Successfully removed user ${userId} from their group`);
        } catch (error) {
            log.error('Error removing user from group:', error);
            throw error;
        }
    }

    /**
     * Delete a group and remove all users from it
     * @param groupId UUID of the group to delete
     */
    async deleteGroup(groupId: string): Promise<void> {
        try {
            // Get all users in the group
            const usersInGroup = await this.getUsersByGroupId(groupId);
            
            // Remove all users from the group
            const removeUserPromises = usersInGroup.map(user => 
                this.removeUserFromGroup(user.user_id)
            );
            await Promise.all(removeUserPromises);

            // Delete the group
            await this.docClient.send(new DeleteCommand({
                TableName: USER_GROUPS_TABLE,
                Key: {
                    group_id: groupId
                }
            }));

            log.info(`Successfully deleted group ${groupId}`);
        } catch (error) {
            log.error('Error deleting group:', error);
            throw error;
        }
    }
    /**
     * Retrieves a group by its name
     * @param groupName - Name of the group to find
     * @returns Group data if found, null otherwise
     */
    async getGroupByName(groupName: string): Promise<UserGroupTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommandDoc({
                TableName: USER_GROUPS_TABLE,
                IndexName: 'group-name-index',
                KeyConditionExpression: 'group_name = :groupName',
                ExpressionAttributeValues: {
                    ':groupName': groupName
                }
            }));

            return result.Items?.[0] as UserGroupTableItem || null;
        } catch (error) {
            log.error('Error getting group by name:', error);
            throw error;
        }
    }
    /**
     * Gets all users belonging to a specific group
     * @param groupId - UUID of the group
     * @returns Array of users in the group
     */
    async getUsersByGroupId(groupId: string): Promise<UserTableItem[]> {
        try {
            const result = await this.docClient.send(new QueryCommandDoc({
                TableName: USERS_TABLE,
                IndexName: 'group-id-index',
                KeyConditionExpression: 'group_id = :groupId',
                ExpressionAttributeValues: {
                    ':groupId': groupId
                }
            }));

            return result.Items as UserTableItem[] || [];
        } catch (error) {
            log.error('Error getting users by group ID:', error);
            throw error;
        }
    }

    async getPackageByName(name: string): Promise<PackageTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommandDoc({
                TableName: PACKAGES_TABLE,
                KeyConditionExpression: '#name = :name',
                ExpressionAttributeNames: {
                    '#name': 'name'
                },
                ExpressionAttributeValues: {
                    ':name': name
                }
            }));

            return result.Items?.[0] as PackageTableItem || null;
        } catch (error) {
            log.error('Error getting package by name:', error);
            throw error;
        }
    }

    async createPackageEntry(packageData: PackageTableItem): Promise<void> {
        try {
            // Check if package already exists
            const existingPackage = await this.getPackageByName(packageData.name);
            if (existingPackage) {
                throw new Error(`Package ${packageData.name} already exists`);
            }

            await this.put<'PackageTableItem'>(PACKAGES_TABLE, packageData);
            
        } catch (error) {
            log.error('Error creating package entry:', error);
            throw error;
        }
    }

    async createPackageVersion(versionData: PackageVersionTableItem): Promise<void> {
        try {
            await this.put<'PackageVersionTableItem'>(PACKAGE_VERSIONS_TABLE, versionData);
        } catch (error) {
            log.error('Error creating package version:', error);
            throw error;
        }
    }

    public async createMetricEntry(metricEntry: PackageMetricsTableItem): Promise<void> {
        try {
            const params = {
                TableName: PACKAGE_METRICS_TABLE,
                Item: metricEntry,
                ConditionExpression: 'attribute_not_exists(metric_id)'
            };

            await this.docClient.send(new PutCommand(params));
            log.info(`Created metric entry for version ${metricEntry.version_id}`);
        } catch (error) {
            log.error('Error creating metric entry:', error);
            throw error;
        }
    }

    public async getMetricsByVersionId(versionId: string): Promise<PackageMetricsTableItem | null> {
        try {
            const params = {
                TableName: PACKAGE_METRICS_TABLE,
                IndexName: 'version_id-index',
                KeyConditionExpression: 'version_id = :versionId',
                ExpressionAttributeValues: {
                    ':versionId': versionId
                }
            };

            const result = await this.docClient.send(new QueryCommandDoc(params));
            return result.Items?.[0] as PackageMetricsTableItem || null;
        } catch (error) {
            log.error('Error getting metrics by version ID:', error);
            throw error;
        }
    }

    /**
     * Get all versions of a package
     * @param packageId The ID of the package
     * @returns Array of package version items
     */
    async getPackageVersions(packageId: string): Promise<PackageVersionTableItem[]> {
        try {
            const result = await this.docClient.send(new QueryCommandDoc({
                TableName: PACKAGE_VERSIONS_TABLE,
                KeyConditionExpression: 'package_id = :packageId',
                ExpressionAttributeValues: {
                    ':packageId': packageId
                }
            }));

            return result.Items as PackageVersionTableItem[] || [];
        } catch (error) {
            log.error('Error getting package versions:', error);
            throw error;
        }
    }

    /**
     * Get a specific version of a package
     * @param packageId The ID of the package
     * @param version The version string
     * @returns Package version item if found, null otherwise
     */
    async getPackageVersion(packageId: string, version: string): Promise<PackageVersionTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommandDoc({
                TableName: PACKAGE_VERSIONS_TABLE,
                KeyConditionExpression: 'package_id = :packageId AND version = :version',
                ExpressionAttributeValues: {
                    ':packageId': packageId,
                    ':version': version
                }
            }));

            return result.Items?.[0] as PackageVersionTableItem || null;
        } catch (error) {
            log.error('Error getting package version:', error);
            throw error;
        }
    }

    /**
     * Get latest version of a package
     * @param packageId The ID of the package
     * @returns Latest package version item if found, null otherwise
     */
    async getLatestPackageVersion(packageId: string): Promise<PackageVersionTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommandDoc({
                TableName: PACKAGE_VERSIONS_TABLE,
                KeyConditionExpression: 'package_id = :packageId',
                ExpressionAttributeValues: {
                    ':packageId': packageId
                },
                ScanIndexForward: false, // Sort in descending order by the range key (version)
                Limit: 1 // Get only the latest version
            }));

            if (!result.Items || result.Items.length === 0) {
                return null;
            }

            return result.Items[0] as PackageVersionTableItem;
        } catch (error) {
            log.error('Error getting latest package version:', error);
            throw error;
        }
    }

    /**
     * Get a package by its ID, including its content
     * @param id The package ID
     * @returns Complete package data or null if not found
     */
    public async getPackageById(id: PackageID): Promise<Package | null> {
        try {
            // Get package metadata using the GSI
            const result = await this.docClient.send(new QueryCommandDoc({
                TableName: PACKAGES_TABLE,
                IndexName: 'package_id-index',
                KeyConditionExpression: 'package_id = :pid',
                ExpressionAttributeValues: {
                    ':pid': id
                }
            }));

            if (!result.Items || result.Items.length === 0) {
                return null;
            }

            const packageData = result.Items[0] as PackageTableItem;
            
            // Get the latest version data
            const latestVersion = await this.getLatestPackageVersion(id);
            if (!latestVersion) {
                return null;
            }

            // Format response according to API spec
            return {
                metadata: {
                    Name: packageData.name,
                    Version: latestVersion.version,
                    ID: packageData.package_id
                },
                data: {
                    Content: latestVersion.zip_file_path
                }
            };
        } catch (error) {
            log.error('Error getting package by ID:', error);
            throw error;
        }
    }

    /**
     * Record a package download in the downloads table
     * @param downloadData The download data to record
     */
    async recordDownload(downloadData: DownloadTableItem): Promise<void> {
        try {    
            await this.put<'DownloadTableItem'>(DOWNLOADS_TABLE, downloadData);
            log.info(`Successfully recorded download for package ${downloadData.package_id}`);
        } catch (error) {
            log.error('Error recording download:', error);
            throw error;
        }
    }

    public async updatePackageLatestVersion(packageId: string, version: string): Promise<void> {
        try {
            const params = {
                TableName: PACKAGES_TABLE,
                Key: {
                    name: packageId
                },
                UpdateExpression: 'SET latest_version = :version',
                ExpressionAttributeValues: {
                    ':version': version
                }
            };

            await this.docClient.send(new UpdateCommand(params));
            log.info(`Updated latest version to ${version} for package ${packageId}`);
        } catch (error) {
            log.error('Error updating package latest version:', error);
            throw error;
        }
    }

    /**
     * Clear all items from a DynamoDB table using batch operations
     * @param tableName The name of the table to clear
     * @returns Promise<void>
     */
    async clearTable(tableName: string): Promise<void> {
        try {
            // First check if table exists and has items
            const scanCommand = new ScanCommand({
                TableName: tableName,
                Limit: 1 // Just check for at least one item
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
                // Get the scan parameters for the table
                const { projectionExpression, expressionAttributeNames } = this.getScanParameters(tableName);
                
                // Create scan command with or without expression attribute names
                const scanParams: any = {
                    TableName: tableName,
                    ExclusiveStartKey: lastEvaluatedKey,
                    ProjectionExpression: projectionExpression,
                };

                // Only add ExpressionAttributeNames if we have any
                if (Object.keys(expressionAttributeNames).length > 0) {
                    scanParams.ExpressionAttributeNames = expressionAttributeNames;
                }

                const batchScanCommand = new ScanCommand(scanParams);
                const scanResult = await this.baseClient.send(batchScanCommand);
                
                if (!scanResult.Items || scanResult.Items.length === 0) {
                    break;
                }

                // Process items in batches of 25 (DynamoDB batch size limit)
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
     * Get scan parameters for a table, including projection expression and attribute names
     * @param tableName The name of the table
     * @returns Object containing projection expression and expression attribute names
     */
    private getScanParameters(tableName: string): { 
        projectionExpression: string; 
        expressionAttributeNames: Record<string, string>;
    } {
        switch (tableName) {
            case PACKAGES_TABLE:
                return {
                    projectionExpression: '#n',
                    expressionAttributeNames: { '#n': 'name' }
                };
            case PACKAGE_VERSIONS_TABLE:
                return {
                    projectionExpression: 'package_id, #v',
                    expressionAttributeNames: { '#v': 'version' }
                };
            case PACKAGE_METRICS_TABLE:
                return {
                    projectionExpression: 'metric_id',
                    expressionAttributeNames: {} // Empty object, will be omitted in scan params
                };
            case DOWNLOADS_TABLE:
                return {
                    projectionExpression: 'download_id',
                    expressionAttributeNames: {} // Empty object, will be omitted in scan params
                };
            case USERS_TABLE:
                return {
                    projectionExpression: 'user_id',
                    expressionAttributeNames: {}
                };
            case USER_GROUPS_TABLE:
                return {
                    projectionExpression: 'group_id',
                    expressionAttributeNames: {}
                };
            default:
                throw new Error(`Unknown table: ${tableName}`);
        }
    }

    /**
     * Extract the key attributes from a DynamoDB item based on the table
     * @param tableName The name of the table
     * @param item The DynamoDB item
     * @returns Record<string, any> The key attributes
     */
    private extractKeyFromItem(tableName: string, item: Record<string, any>): Record<string, any> {
        switch (tableName) {
            case PACKAGES_TABLE:
                return { name: item.name };
            case PACKAGE_VERSIONS_TABLE:
                return { 
                    package_id: item.package_id,
                    version: item.version 
                };
            case PACKAGE_METRICS_TABLE:
                return { metric_id: item.metric_id };
            case DOWNLOADS_TABLE:
                return { download_id: item.download_id };    
            case USERS_TABLE:
                return { user_id: item.user_id };
            case USER_GROUPS_TABLE:
                return { group_id: item.group_id };
            default:
                throw new Error(`Unknown table: ${tableName}`);
        }
    }

    /**
     * Clear all tables in the system
     * @returns Promise<void>
     */
    async clearAllTables(): Promise<void> {
        try {
            await Promise.all([
                this.clearTable(PACKAGES_TABLE),
                this.clearTable(PACKAGE_VERSIONS_TABLE),
                this.clearTable(PACKAGE_METRICS_TABLE),
                this.clearTable(DOWNLOADS_TABLE),
                this.clearTable(USERS_TABLE),
                this.clearTable(USER_GROUPS_TABLE)
            ]);
            log.info('Successfully cleared all tables');
        } catch (error) {
            log.error('Error clearing all tables:', error);
            throw error;
        }
    }
}

export const dynamoDBService = new DynamoDBService();