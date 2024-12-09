import { PackageDynamoService } from '../src/services/dynamoServices/packageDynamoService';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
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
    ScanCommand: jest.fn()
}));

jest.mock('../src/logger');

describe('PackageDynamoService', () => {
    let service: PackageDynamoService;
    let mockSend: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new PackageDynamoService();
        mockSend = (DynamoDBDocumentClient.from(new DynamoDBClient({})) as any).send;
    });

    describe('getPackageById', () => {
        const mockPackageId = 'package123';
        const mockPackage = {
            package_id: mockPackageId,
            name: 'test-package',
            latest_version: '1.0.0'
        };
        const mockVersion = {
            package_id: mockPackageId,
            version: '1.0.0',
            zip_file_path: 's3://bucket/path'
        };

        it('should successfully get a package by ID', async () => {
            mockSend
                .mockResolvedValueOnce({ Items: [mockPackage] })  // getPackageById query
                .mockResolvedValueOnce({ Items: [mockVersion] }); // getLatestPackageVersion query

            const result = await service.getPackageById(mockPackageId);

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
        });

        it('should return null when package not found', async () => {
            mockSend.mockResolvedValueOnce({ Items: [] });

            const result = await service.getPackageById(mockPackageId);

            expect(result).toBeNull();
        });

        it('should return null when version not found', async () => {
            mockSend
                .mockResolvedValueOnce({ Items: [mockPackage] })
                .mockResolvedValueOnce({ Items: [] });

            const result = await service.getPackageById(mockPackageId);

            expect(result).toBeNull();
        });

        it('should handle errors', async () => {
            const mockError = new Error('DynamoDB error');
            mockSend.mockRejectedValueOnce(mockError);

            await expect(service.getPackageById(mockPackageId))
                .rejects.toThrow(mockError);
            expect(log.error).toHaveBeenCalledWith(
                'Error getting package by ID:',
                mockError
            );
        });
    });

    describe('getPackageByName', () => {
        const mockName = 'test-package';
        const mockPackage = {
            package_id: 'package123',
            name: mockName,
            latest_version: '1.0.0'
        };

        it('should successfully get a package by name', async () => {
            mockSend.mockResolvedValueOnce({ Items: [mockPackage] });

            const result = await service.getPackageByName(mockName);

            expect(result).toEqual(mockPackage);
            expect(QueryCommand).toHaveBeenCalledWith({
                TableName: expect.any(String),
                KeyConditionExpression: '#name = :name',
                ExpressionAttributeNames: {
                    '#name': 'name'
                },
                ExpressionAttributeValues: {
                    ':name': mockName
                }
            });
        });

        it('should return null when package not found', async () => {
            mockSend.mockResolvedValueOnce({ Items: [] });

            const result = await service.getPackageByName(mockName);

            expect(result).toBeNull();
        });

        it('should handle errors', async () => {
            const mockError = new Error('DynamoDB error');
            mockSend.mockRejectedValueOnce(mockError);

            await expect(service.getPackageByName(mockName))
                .rejects.toThrow(mockError);
            expect(log.error).toHaveBeenCalledWith(
                'Error getting package by name:',
                mockError
            );
        });
    });

    describe('getLatestPackageVersion', () => {
        const mockPackageId = 'package123';
        const mockVersion = {
            package_id: mockPackageId,
            version: '1.0.0',
            zip_file_path: 's3://bucket/path'
        };

        it('should successfully get latest package version', async () => {
            mockSend.mockResolvedValueOnce({ Items: [mockVersion] });

            const result = await service.getLatestPackageVersion(mockPackageId);

            expect(result).toEqual(mockVersion);
            expect(QueryCommand).toHaveBeenCalledWith({
                TableName: expect.any(String),
                KeyConditionExpression: 'package_id = :packageId',
                ExpressionAttributeValues: {
                    ':packageId': mockPackageId
                },
                ScanIndexForward: false,
                Limit: 1
            });
        });

        it('should return null when no versions found', async () => {
            mockSend.mockResolvedValueOnce({ Items: [] });

            const result = await service.getLatestPackageVersion(mockPackageId);

            expect(result).toBeNull();
        });

        it('should handle errors', async () => {
            const mockError = new Error('DynamoDB error');
            mockSend.mockRejectedValueOnce(mockError);

            await expect(service.getLatestPackageVersion(mockPackageId))
                .rejects.toThrow(mockError);
            expect(log.error).toHaveBeenCalledWith(
                'Error getting latest package version:',
                mockError
            );
        });
    });

    describe('extractKeyFromItem', () => {
        const PACKAGES_TABLE = process.env.DYNAMODB_PACKAGES_TABLE || 'Packages';
        const PACKAGE_VERSIONS_TABLE = process.env.DYNAMODB_PACKAGE_VERSIONS_TABLE || 'PackageVersions';

        it('should extract key from packages table item', () => {
            const mockItem = { name: 'test-package', other: 'field' };
            const result = (service as any).extractKeyFromItem(
                PACKAGES_TABLE,
                mockItem
            );
            expect(result).toEqual({ name: 'test-package' });
        });

        it('should extract key from package versions table item', () => {
            const mockItem = { 
                package_id: 'pkg123',
                version: '1.0.0',
                other: 'field'
            };
            const result = (service as any).extractKeyFromItem(
                PACKAGE_VERSIONS_TABLE,
                mockItem
            );
            expect(result).toEqual({
                package_id: 'pkg123',
                version: '1.0.0'
            });
        });

        it('should throw error for unknown table', () => {
            const mockItem = { id: '123' };
            expect(() => 
                (service as any).extractKeyFromItem('UnknownTable', mockItem)
            ).toThrow('Unknown table: UnknownTable');
        });
    });
});
