import { QueryCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { BaseDynamoService } from "./baseDynamoService";
import { UserTableItem, UserGroupTableItem } from "../../types";
import { log } from "../../logger";
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || 'Users';
const USER_GROUPS_TABLE = process.env.DYNAMODB_USER_GROUPS_TABLE || 'UserGroups';

export class UserDynamoService extends BaseDynamoService {
    /**
     * Get a user by their ID
     */
    async getUserById(userId: string): Promise<UserTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: USERS_TABLE,
                KeyConditionExpression: 'user_id = :uid',
                ExpressionAttributeValues: {
                    ':uid': userId
                }
            }));

            return result.Items?.[0] as UserTableItem || null;
        } catch (error) {
            log.error('Error getting user by ID:', error);
            throw error;
        }
    }

    /**
     * Get a user by their username
     */
    async getUserByUsername(username: string): Promise<UserTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommand({
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
     * Get all users belonging to a specific group
     */
    async getUsersByGroupId(groupId: string): Promise<UserTableItem[]> {
        try {
            const result = await this.docClient.send(new QueryCommand({
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

    /**
     * Get a group by its ID
     */
    async getGroupById(groupId: string): Promise<UserGroupTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: USER_GROUPS_TABLE,
                KeyConditionExpression: 'group_id = :gid',
                ExpressionAttributeValues: {
                    ':gid': groupId
                }
            }));

            return result.Items?.[0] as UserGroupTableItem || null;
        } catch (error) {
            log.error('Error getting group by ID:', error);
            throw error;
        }
    }

    /**
     * Get a group by its name
     */
    async getGroupByName(groupName: string): Promise<UserGroupTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommand({
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
     * Create a new group
     */
    async createGroup(groupName: string): Promise<void> {
        try {
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
     * Add a user to a group
     */
    async addUserToGroup(userId: string, groupId: string): Promise<void> {
        try {
            const user = await this.getUserById(userId);
            const group = await this.getGroupById(groupId);

            if (!user) {
                throw new Error(`User ${userId} does not exist`);
            }
            if (!group) {
                throw new Error(`Group ${groupId} does not exist`);
            }

            await this.docClient.send(new UpdateCommand({
                TableName: USERS_TABLE,
                Key: {
                    user_id: userId
                },
                UpdateExpression: 'SET group_id = :groupId',
                ExpressionAttributeValues: {
                    ':groupId': groupId
                }
            }));
            log.info(`Successfully added user ${userId} to group ${groupId}`);
        } catch (error) {
            log.error('Error adding user to group:', error);
            throw error;
        }
    }
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
     * Remove a user from their group
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

            await this.docClient.send(new UpdateCommand({
                TableName: USERS_TABLE,
                Key: {
                    user_id: userId
                },
                UpdateExpression: 'REMOVE group_id'
            }));
            log.info(`Successfully removed user ${userId} from their group`);
        } catch (error) {
            log.error('Error removing user from group:', error);
            throw error;
        }
    }

    /**
     * Delete a group and remove all users from it
     */
    async deleteGroup(groupId: string): Promise<void> {
        try {
            const usersInGroup = await this.getUsersByGroupId(groupId);
            
            const removeUserPromises = usersInGroup.map(user => 
                this.removeUserFromGroup(user.user_id)
            );
            await Promise.all(removeUserPromises);

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
     * Delete a user by their ID
     * @param userId - ID of the user to delete
     */
    async deleteUser(userId: string): Promise<void> {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw new Error(`User ${userId} does not exist`);
            }

            // First remove user from their group if they're in one
            if (user.group_id) {
                await this.removeUserFromGroup(userId);
            }

            // Then delete the user
            await this.docClient.send(new DeleteCommand({
                TableName: USERS_TABLE,
                Key: {
                    user_id: userId
                }
            }));

            log.info(`Successfully deleted user ${userId}`);
        } catch (error) {
            log.error('Error deleting user:', error);
            throw error;
        }
    }

    protected extractKeyFromItem(tableName: string, item: Record<string, any>): Record<string, any> {
        switch (tableName) {
            case USERS_TABLE:
                return { user_id: item.user_id };
            case USER_GROUPS_TABLE:
                return { group_id: item.group_id };
            default:
                throw new Error(`Unknown table: ${tableName}`);
        }
    }
}

export const userDynamoService = new UserDynamoService();
