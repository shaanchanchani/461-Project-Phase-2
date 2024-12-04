import { DynamoDBService } from '../src/services/dynamoDBService';
import { PackageTableItem, PackageVersionTableItem } from '../src/types';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: jest.fn().mockImplementation(() => ({
        send: jest.fn()
    }))
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: jest.fn().mockImplementation(() => ({
            send: jest.fn()
        }))
    },
    PutCommand: jest.fn().mockImplementation((input) => ({
        input
    })),
    QueryCommand: jest.fn().mockImplementation((input) => ({
        input
    })),
    GetCommand: jest.fn().mockImplementation((input) => ({
        input
    }))
}));

describe('DynamoDBService', () => {
    let service: DynamoDBService;
    let mockDocClientSend: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new DynamoDBService();
        mockDocClientSend = jest.fn();
        (service as any).docClient.send = mockDocClientSend;
    });

    describe('put', () => {
        it('should put item in table successfully', async () => {
            const tableName = 'TestTable';
            const item = { id: '123', name: 'test' };
            mockDocClientSend.mockResolvedValue({});

            await service.put(tableName, item);

            expect(mockDocClientSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: {
                        TableName: tableName,
                        Item: item
                    }
                })
            );
        });

        it('should throw error when put fails', async () => {
            const error = new Error('Put failed');
            mockDocClientSend.mockRejectedValue(error);

            await expect(service.put('table', {})).rejects.toThrow('Put failed');
        });
    });

    describe('getPackageByName', () => {
        it('should return package when found', async () => {
            const mockPackage: PackageTableItem = {
                package_id: '123',
                name: 'test-package',
                latest_version: '1.0.0',
                description: 'Test package',
                created_at: new Date().toISOString(),
                user_id: 'test-user'
            };

            mockDocClientSend.mockResolvedValue({ Items: [mockPackage] });

            const result = await service.getPackageByName('test-package');

            expect(result).toEqual(mockPackage);
            expect(mockDocClientSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: {
                        TableName: 'Packages',
                        KeyConditionExpression: '#name = :name',
                        ExpressionAttributeNames: { '#name': 'name' },
                        ExpressionAttributeValues: { ':name': 'test-package' }
                    }
                })
            );
        });

        it('should return null when package not found', async () => {
            mockDocClientSend.mockResolvedValue({ Items: [] });

            const result = await service.getPackageByName('non-existent');

            expect(result).toBeNull();
        });

        it('should throw error when query fails', async () => {
            mockDocClientSend.mockRejectedValue(new Error('Query failed'));

            await expect(service.getPackageByName('test')).rejects.toThrow('Query failed');
        });
    });

    describe('createPackageEntry', () => {
        const mockPackage: PackageTableItem = {
            package_id: '123',
            name: 'test-package',
            latest_version: '1.0.0',
            description: 'Test package',
            created_at: new Date().toISOString(),
            user_id: 'test-user'
        };

        it('should create package entry when package does not exist', async () => {
            // Mock getPackageByName to return null (package doesn't exist)
            mockDocClientSend.mockResolvedValueOnce({ Items: [] });
            // Mock put operation
            mockDocClientSend.mockResolvedValueOnce({});

            await service.createPackageEntry(mockPackage);

            expect(mockDocClientSend).toHaveBeenCalledTimes(2);
            // Verify put operation
            expect(mockDocClientSend).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    input: {
                        TableName: 'Packages',
                        Item: mockPackage
                    }
                })
            );
        });

        it('should throw error when package already exists', async () => {
            // Mock getPackageByName to return existing package
            mockDocClientSend.mockResolvedValueOnce({ Items: [mockPackage] });

            await expect(service.createPackageEntry(mockPackage))
                .rejects.toThrow(`Package ${mockPackage.name} already exists`);
        });
    });

    describe('createPackageVersion', () => {
        const mockVersion: PackageVersionTableItem = {
            version_id: 'v123',
            package_id: '123',
            version: '1.0.0',
            zip_file_path: 's3://bucket/path',
            debloated: false,
            created_at: new Date().toISOString()
        };

        it('should create package version successfully', async () => {
            mockDocClientSend.mockResolvedValue({});

            await service.createPackageVersion(mockVersion);

            expect(mockDocClientSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: {
                        TableName: 'PackageVersions',
                        Item: mockVersion
                    }
                })
            );
        });

        it('should throw error when version creation fails', async () => {
            mockDocClientSend.mockRejectedValue(new Error('Version creation failed'));

            await expect(service.createPackageVersion(mockVersion))
                .rejects.toThrow('Version creation failed');
        });
    });

    describe('getPackageById', () => {
        it('should get package by ID successfully', async () => {
            const mockPackage: PackageTableItem = {
                package_id: '123',
                name: 'test-package',
                latest_version: '1.0.0',
                description: 'Test package',
                created_at: new Date().toISOString(),
                user_id: 'user123'
            };

            const mockVersion: PackageVersionTableItem = {
                version_id: 'v123',
                package_id: '123',
                version: '1.0.0',
                zip_file_path: 's3://bucket/path',
                debloated: false,
                created_at: new Date().toISOString()
            };

            // Mock getting package using GSI
            mockDocClientSend.mockResolvedValueOnce({
                Items: [mockPackage]
            });

            // Mock getting latest version
            mockDocClientSend.mockResolvedValueOnce({
                Items: [mockVersion]
            });

            const result = await service.getPackageById('123');

            expect(result).toEqual({
                metadata: {
                    Name: mockPackage.name,
                    Version: mockVersion.version,
                    ID: mockPackage.package_id
                },
                data: {
                    Content: mockVersion.zip_file_path
                }
            });

            // Verify GSI query
            expect(mockDocClientSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: {
                        TableName: 'Packages',
                        IndexName: 'package_id-index',
                        KeyConditionExpression: 'package_id = :pid',
                        ExpressionAttributeValues: {
                            ':pid': '123'
                        }
                    }
                })
            );
        });

        it('should return null if package not found', async () => {
            // Mock empty result from GSI query
            mockDocClientSend.mockResolvedValueOnce({
                Items: []
            });

            const result = await service.getPackageById('123');
            expect(result).toBeNull();
        });

        it('should return null if version not found', async () => {
            const mockPackage: PackageTableItem = {
                package_id: '123',
                name: 'test-package',
                latest_version: '1.0.0',
                description: 'Test package',
                created_at: new Date().toISOString(),
                user_id: 'user123'
            };

            // Mock getting package using GSI
            mockDocClientSend.mockResolvedValueOnce({
                Items: [mockPackage]
            });

            // Mock getting latest version (not found)
            mockDocClientSend.mockResolvedValueOnce({
                Items: []
            });

            const result = await service.getPackageById('123');
            expect(result).toBeNull();
        });

        it('should throw error when query fails', async () => {
            mockDocClientSend.mockRejectedValue(new Error('Query failed'));

            await expect(service.getPackageById('123'))
                .rejects.toThrow('Query failed');
        });
    });
});