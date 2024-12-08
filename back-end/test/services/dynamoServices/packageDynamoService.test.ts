import { PackageDynamoService } from '../../../src/services/dynamoServices';
import { QueryCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Package, PackageTableItem, PackageVersionTableItem } from '../../../src/types';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('PackageDynamoService', () => {
    let service: PackageDynamoService;
    const mockSend = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        service = new PackageDynamoService();
        (service as any).docClient = { send: mockSend };
    });

    describe('getPackageById', () => {
        const mockPackage: PackageTableItem = {
            package_id: '123',
            name: 'test-package',
            latest_version: '1.0.0',
            created_at: new Date().toISOString(),
            user_id: 'user123',
            description: 'Test package description'
        };

        const mockVersion: PackageVersionTableItem = {
            version_id: 'v123',
            package_id: '123',
            version: '1.0.0',
            name: 'test-package',
            zip_file_path: 's3://path',
            created_at: new Date().toISOString(),
            debloated: false,
            standalone_cost: 100,
            total_cost: 100
        };

        it('should return package data when found', async () => {
            mockSend
                .mockResolvedValueOnce({ Items: [mockPackage] })
                .mockResolvedValueOnce({ Items: [mockVersion] });

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

            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: expect.any(String),
                    KeyConditionExpression: 'package_id = :pid'
                })
            );
        });

        it('should return null when package not found', async () => {
            mockSend.mockResolvedValueOnce({ Items: [] });

            const result = await service.getPackageById('123');
            expect(result).toBeNull();
        });
    });

    // Add more tests for other package operations
});
