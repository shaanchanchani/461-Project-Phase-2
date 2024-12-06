import { DynamoDBService } from '../src/services/dynamoDBService';
import { 
    UserTableItem,
    UserGroupTableItem,
    PackageTableItem, 
    PackageVersionTableItem,
    PackageMetricsTableItem,
    DownloadTableItem
} from '../src/types';
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
    UpdateCommand
} from "@aws-sdk/lib-dynamodb";

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('DynamoDBService', () => {
    let service: DynamoDBService;
    let mockDocClientSend: jest.Mock;
    let mockBaseClientSend: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDocClientSend = jest.fn();
        mockBaseClientSend = jest.fn();
        
        // Mock both clients
        service = new DynamoDBService();
        (service as any).docClient.send = mockDocClientSend;
        (service as any).baseClient.send = mockBaseClientSend;
    });

    describe('User Operations', () => {
        describe('createUser', () => {
            it('should create a new user successfully', async () => {
                // Mock checking for existing user
                mockDocClientSend.mockResolvedValueOnce({ Items: [] });
                
                // Mock user creation
                mockDocClientSend.mockResolvedValueOnce({});

                await service.createUser('testuser', 'password123', 'uploader');

                // Verify user creation call
                expect(mockDocClientSend).toHaveBeenCalledTimes(2);
                expect(mockDocClientSend).toHaveBeenLastCalledWith(
                    expect.objectContaining({
                        input: expect.objectContaining({
                            TableName: 'Users',
                            Item: expect.objectContaining({
                                username: 'testuser',
                                role: 'uploader'
                            })
                        })
                    })
                );
            });

            it('should throw error if user already exists', async () => {
                mockDocClientSend.mockResolvedValueOnce({ 
                    Items: [{ username: 'testuser' }] 
                });

                await expect(
                    service.createUser('testuser', 'password123', 'uploader')
                ).rejects.toThrow('Username testuser already exists');
            });
        });

        describe('getUserByUsername', () => {
            it('should return user if found', async () => {
                const mockUser = {
                    user_id: 'test-id',
                    username: 'testuser',
                    role: 'uploader'
                };
                mockDocClientSend.mockResolvedValueOnce({ Items: [mockUser] });

                const result = await service.getUserByUsername('testuser');
                expect(result).toEqual(mockUser);
            });

            it('should return null if user not found', async () => {
                mockDocClientSend.mockResolvedValueOnce({ Items: [] });

                const result = await service.getUserByUsername('nonexistent');
                expect(result).toBeNull();
            });
        });
    });

    describe('Package Operations', () => {
        describe('createPackageEntry', () => {
            it('should create a package successfully', async () => {
                const mockPackage: PackageTableItem = {
                    package_id: 'pkg-123',
                    name: 'test-package',
                    latest_version: '1.0.0',
                    description: 'Test package',
                    created_at: new Date().toISOString(),
                    user_id: 'user-123'
                };

                // Mock check for existing package
                mockDocClientSend.mockResolvedValueOnce({ Items: [] });
                // Mock package creation
                mockDocClientSend.mockResolvedValueOnce({});

                await service.createPackageEntry(mockPackage);

                expect(mockDocClientSend).toHaveBeenCalledTimes(2);
                expect(mockDocClientSend).toHaveBeenLastCalledWith(
                    expect.objectContaining({
                        input: {
                            TableName: 'Packages',
                            Item: mockPackage
                        }
                    })
                );
            });

            it('should throw error if package already exists', async () => {
                mockDocClientSend.mockResolvedValueOnce({ 
                    Items: [{ name: 'test-package' }] 
                });

                const mockPackage: PackageTableItem = {
                    package_id: 'pkg-123',
                    name: 'test-package',
                    latest_version: '1.0.0',
                    description: 'Test package',
                    created_at: new Date().toISOString(),
                    user_id: 'user-123'
                };

                await expect(
                    service.createPackageEntry(mockPackage)
                ).rejects.toThrow('Package test-package already exists');
            });
        });

        describe('getLatestPackageVersion', () => {
            it('should return the latest version if found', async () => {
                const mockVersion: PackageVersionTableItem = {
                    version_id: 'v1',
                    package_id: 'pkg-123',
                    version: '1.0.0',
                    zip_file_path: 's3://test/1.0.0',
                    debloated: false,
                    created_at: new Date().toISOString(),
                    standalone_cost: 1024,
                    total_cost: 1024
                };

                mockDocClientSend.mockResolvedValueOnce({ Items: [mockVersion] });

                const result = await service.getLatestPackageVersion('pkg-123');
                expect(result).toEqual(mockVersion);
            });

            it('should return null if no versions found', async () => {
                mockDocClientSend.mockResolvedValueOnce({ Items: [] });

                const result = await service.getLatestPackageVersion('pkg-123');
                expect(result).toBeNull();
            });
        });
    });

    describe('Table Operations', () => {
        describe('clearTable', () => {
            it('should clear all items from a table', async () => {
                // Mock initial check
                mockBaseClientSend.mockResolvedValueOnce({ Items: [{ id: '1' }] });
                
                // Mock full scan
                mockBaseClientSend.mockResolvedValueOnce({
                    Items: [
                        { user_id: '1' },
                        { user_id: '2' }
                    ]
                });
                
                // Mock batch delete
                mockBaseClientSend.mockResolvedValueOnce({});

                await service.clearTable('Users');

                expect(mockBaseClientSend).toHaveBeenCalledWith(
                    expect.objectContaining({
                        input: expect.objectContaining({
                            TableName: 'Users'
                        })
                    })
                );
            });

            it('should handle empty table', async () => {
                mockBaseClientSend.mockResolvedValueOnce({ Items: [] });

                await service.clearTable('Users');

                expect(mockBaseClientSend).toHaveBeenCalledTimes(1);
            });
        });

        describe('clearAllTables', () => {
            it('should clear all configured tables', async () => {
                mockBaseClientSend.mockResolvedValue({ Items: [] });

                await service.clearAllTables();

                const expectedTables = [
                    'Packages',
                    'PackageVersions',
                    'PackageMetrics',
                    'Downloads',
                    'Users',
                    'UserGroups'
                ];

                expectedTables.forEach(tableName => {
                    expect(mockBaseClientSend).toHaveBeenCalledWith(
                        expect.objectContaining({
                            input: expect.objectContaining({
                                TableName: tableName
                            })
                        })
                    );
                });
            });
        });
    });
});
