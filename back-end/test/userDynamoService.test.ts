import { UserDynamoService } from '../src/services/dynamoServices/userDynamoService';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { log } from '../src/logger';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: jest.fn().mockImplementation(() => ({
        send: jest.fn()
    }))
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: jest.fn().mockReturnValue({
            send: jest.fn()
        })
    },
    QueryCommand: jest.fn(),
    UpdateCommand: jest.fn(),
    DeleteCommand: jest.fn()
}));

jest.mock('../src/logger');

describe('UserDynamoService', () => {
    let service: UserDynamoService;
    let mockSend: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new UserDynamoService();
        mockSend = (DynamoDBDocumentClient.from(new DynamoDBClient({})) as any).send;
    });

    describe('getUserById', () => {
        const mockUserId = 'user123';
        const mockUser = {
            user_id: mockUserId,
            username: 'testuser',
            password_hash: 'hashedpassword',
            is_admin: false
        };

        it('should successfully get a user by ID', async () => {
            mockSend.mockResolvedValueOnce({ Items: [mockUser] });

            const result = await service.getUserById(mockUserId);

            expect(result).toEqual(mockUser);
            expect(QueryCommand).toHaveBeenCalledWith({
                TableName: expect.any(String),
                KeyConditionExpression: 'user_id = :uid',
                ExpressionAttributeValues: {
                    ':uid': mockUserId
                }
            });
        });

        it('should return null when user not found', async () => {
            mockSend.mockResolvedValueOnce({ Items: [] });

            const result = await service.getUserById(mockUserId);

            expect(result).toBeNull();
        });

        it('should handle errors', async () => {
            const mockError = new Error('DynamoDB error');
            mockSend.mockRejectedValueOnce(mockError);

            await expect(service.getUserById(mockUserId))
                .rejects.toThrow(mockError);
            expect(log.error).toHaveBeenCalledWith(
                'Error getting user by ID:',
                mockError
            );
        });
    });

    describe('getUserByUsername', () => {
        const mockUsername = 'testuser';
        const mockUser = {
            user_id: 'user123',
            username: mockUsername,
            password_hash: 'hashedpassword',
            is_admin: false
        };

        it('should successfully get a user by username', async () => {
            mockSend.mockResolvedValueOnce({ Items: [mockUser] });

            const result = await service.getUserByUsername(mockUsername);

            expect(result).toEqual(mockUser);
            expect(QueryCommand).toHaveBeenCalledWith({
                TableName: expect.any(String),
                IndexName: 'username-index',
                KeyConditionExpression: 'username = :username',
                ExpressionAttributeValues: {
                    ':username': mockUsername
                }
            });
        });

        it('should return null when user not found', async () => {
            mockSend.mockResolvedValueOnce({ Items: [] });

            const result = await service.getUserByUsername(mockUsername);

            expect(result).toBeNull();
        });

        it('should handle errors', async () => {
            const mockError = new Error('DynamoDB error');
            mockSend.mockRejectedValueOnce(mockError);

            await expect(service.getUserByUsername(mockUsername))
                .rejects.toThrow(mockError);
            expect(log.error).toHaveBeenCalledWith(
                'Error getting user by username:',
                mockError
            );
        });
    });

    describe('extractKeyFromItem', () => {
        const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || 'Users';
        const USER_GROUPS_TABLE = process.env.DYNAMODB_USER_GROUPS_TABLE || 'UserGroups';

        it('should extract key from users table item', () => {
            const mockItem = { user_id: 'user123', other: 'field' };
            const result = (service as any).extractKeyFromItem(
                USERS_TABLE,
                mockItem
            );
            expect(result).toEqual({ user_id: 'user123' });
        });

        it('should extract key from user groups table item', () => {
            const mockItem = { 
                group_id: 'group123',
                other: 'field'
            };
            const result = (service as any).extractKeyFromItem(
                USER_GROUPS_TABLE,
                mockItem
            );
            expect(result).toEqual({ group_id: 'group123' });
        });

        it('should throw error for unknown table', () => {
            const mockItem = { id: '123' };
            expect(() => 
                (service as any).extractKeyFromItem('UnknownTable', mockItem)
            ).toThrow('Unknown table: UnknownTable');
        });
    });
});
