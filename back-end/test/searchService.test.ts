import { SearchService } from '../src/services/searchService';
import { packageDynamoService } from '../src/services/dynamoServices';
import type { PackageTableItem, PackageVersionTableItem } from '../src/types';

// Mock the packageDynamoService
jest.mock('../src/services/dynamoServices', () => ({
    packageDynamoService: {
        getAllPackageVersions: jest.fn(),
        getAllVersionsByName: jest.fn()
    }
}));

describe('SearchService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('listPackages', () => {
        const mockVersions = [
            {
                package_id: 'test-id-1',
                name: 'test-package-1',
                version: '1.0.0',
                created_at: new Date().toISOString(),
                user_id: 'user123',
                description: 'Test package 1',
                zip_file_path: 's3://bucket/test1.zip'
            },
            {
                package_id: 'test-id-2',
                name: 'test-package-2',
                version: '2.0.0',
                created_at: new Date().toISOString(),
                user_id: 'user123',
                description: 'Test package 2',
                zip_file_path: 's3://bucket/test2.zip'
            }
        ];

        it('should return all packages when no offset is provided', async () => {
            (packageDynamoService.getAllPackageVersions as jest.Mock).mockResolvedValue(mockVersions);

            const result = await SearchService.listPackages();

            expect(result).toEqual(mockVersions.map(version => ({
                Name: version.name,
                ID: version.package_id,
                Version: version.version
            })));
            expect(packageDynamoService.getAllPackageVersions).toHaveBeenCalledWith(undefined);
        });

        it('should use offset for pagination when provided', async () => {
            const offset = 'test-offset';
            (packageDynamoService.getAllPackageVersions as jest.Mock).mockResolvedValue(mockVersions);

            const result = await SearchService.listPackages(offset);

            expect(result).toEqual(mockVersions.map(version => ({
                Name: version.name,
                ID: version.package_id,
                Version: version.version
            })));
            expect(packageDynamoService.getAllPackageVersions).toHaveBeenCalledWith(offset);
        });

        it('should handle empty result', async () => {
            (packageDynamoService.getAllPackageVersions as jest.Mock).mockResolvedValue([]);

            const result = await SearchService.listPackages();

            expect(result).toEqual([]);
            expect(packageDynamoService.getAllPackageVersions).toHaveBeenCalledWith(undefined);
        });

        it('should handle undefined version', async () => {
            const mockVersionWithoutVersion = [{
                ...mockVersions[0],
                version: undefined
            }];
            (packageDynamoService.getAllPackageVersions as jest.Mock).mockResolvedValue(mockVersionWithoutVersion);

            const result = await SearchService.listPackages();

            expect(result).toEqual([{
                Name: mockVersionWithoutVersion[0].name,
                ID: mockVersionWithoutVersion[0].package_id,
                Version: undefined
            }]);
        });

        it('should handle errors', async () => {
            const error = new Error('DynamoDB error');
            (packageDynamoService.getAllPackageVersions as jest.Mock).mockRejectedValue(error);

            await expect(SearchService.listPackages()).rejects.toThrow('DynamoDB error');
        });
    });

    describe('searchPackages', () => {
        const mockVersions = [
            {
                package_id: 'test-id-123',
                name: 'test-package',
                version: '1.0.0',
                created_at: new Date().toISOString(),
                user_id: 'user123',
                description: 'Test package',
                zip_file_path: 's3://bucket/test.zip'
            }
        ];

        it('should return all packages when wildcard query is used', async () => {
            (packageDynamoService.getAllPackageVersions as jest.Mock).mockResolvedValue(mockVersions);

            const result = await SearchService.searchPackages([{ Name: '*' }]);

            expect(result).toEqual(mockVersions.map(version => ({
                Name: version.name,
                ID: version.package_id,
                Version: version.version
            })));
        });

        it('should return package when exact match is found', async () => {
            (packageDynamoService.getAllVersionsByName as jest.Mock).mockResolvedValue(mockVersions);

            const result = await SearchService.searchPackages([{ Name: 'test-package' }]);

            expect(result).toEqual([{
                Name: mockVersions[0].name,
                ID: mockVersions[0].package_id,
                Version: mockVersions[0].version
            }]);
            expect(packageDynamoService.getAllVersionsByName).toHaveBeenCalledWith('test-package');
        });

        it('should handle version constraints', async () => {
            const mockVersionsWithMultipleVersions = [
                { ...mockVersions[0], version: '1.0.0' },
                { ...mockVersions[0], version: '1.1.0' },
                { ...mockVersions[0], version: '2.0.0' }
            ];
            (packageDynamoService.getAllVersionsByName as jest.Mock).mockResolvedValue(mockVersionsWithMultipleVersions);

            const result = await SearchService.searchPackages([{ Name: 'test-package', Version: '^1.0.0' }]);

            expect(result).toEqual([
                {
                    Name: mockVersions[0].name,
                    ID: mockVersions[0].package_id,
                    Version: '1.0.0'
                },
                {
                    Name: mockVersions[0].name,
                    ID: mockVersions[0].package_id,
                    Version: '1.1.0'
                }
            ]);
        });

        it('should handle multiple queries', async () => {
            (packageDynamoService.getAllVersionsByName as jest.Mock)
                .mockResolvedValueOnce([mockVersions[0]])
                .mockResolvedValueOnce([{ ...mockVersions[0], name: 'other-package' }]);

            const result = await SearchService.searchPackages([
                { Name: 'test-package' },
                { Name: 'other-package' }
            ]);

            expect(result).toEqual([
                {
                    Name: 'test-package',
                    ID: mockVersions[0].package_id,
                    Version: mockVersions[0].version
                },
                {
                    Name: 'other-package',
                    ID: mockVersions[0].package_id,
                    Version: mockVersions[0].version
                }
            ]);
        });

        it('should handle no matches', async () => {
            (packageDynamoService.getAllVersionsByName as jest.Mock).mockResolvedValue([]);

            const result = await SearchService.searchPackages([{ Name: 'non-existent' }]);

            expect(result).toEqual([]);
        });

        it('should handle errors', async () => {
            const error = new Error('DynamoDB error');
            (packageDynamoService.getAllVersionsByName as jest.Mock).mockRejectedValue(error);

            await expect(SearchService.searchPackages([
                { Name: 'test-package' }
            ])).rejects.toThrow('DynamoDB error');
        });
    });
});
