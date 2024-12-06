import { UserDynamoService } from '../../../src/services/dynamoServices';
import { QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { UserTableItem, UserGroupTableItem } from '../../../src/types';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('UserDynamoService', () => {
    let service: UserDynamoService;
    const mockSend = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        service = new UserDynamoService();
        (service as any).docClient = { send: mockSend };
    });

    describe('getUserById', () => {
        const mockUser: UserTableItem = {
            user_id: 'user123',
            username: 'testuser',
            password_hash: 'hashedpassword',
            role: 'downloader',
            created_at: new Date().toISOString()
        };

        it('should return user when found', async () => {
            mockSend.mockResolvedValueOnce({ Items: [mockUser] });

            const result = await service.getUserById('user123');
            expect(result).toEqual(mockUser);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: expect.any(String),
                    KeyConditionExpression: 'user_id = :uid'
                })
            );
        });

        it('should return null when user not found', async () => {
            mockSend.mockResolvedValueOnce({ Items: [] });

            const result = await service.getUserById('user123');
            expect(result).toBeNull();
        });
    });

    describe('getUsersByGroupId', () => {
        const mockUsers: UserTableItem[] = [
            {
                user_id: 'user123',
                username: 'testuser1',
                password_hash: 'hashedpassword1',
                role: 'downloader',
                created_at: new Date().toISOString(),
                group_id: 'group123'
            },
            {
                user_id: 'user456',
                username: 'testuser2',
                password_hash: 'hashedpassword2',
                role: 'downloader',
                created_at: new Date().toISOString(),
                group_id: 'group123'
            }
        ];

        it('should return users in group', async () => {
            mockSend.mockResolvedValueOnce({ Items: mockUsers });

            const result = await service.getUsersByGroupId('group123');
            expect(result).toEqual(mockUsers);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: expect.any(String),
                    IndexName: 'group-id-index',
                    KeyConditionExpression: 'group_id = :groupId'
                })
            );
        });
    });

    // Add more tests for other user operations
});
