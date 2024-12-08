import { SearchService } from '../src/services/searchService';
import { packageDynamoService } from '../src/services/dynamoServices';
import type { PackageTableItem, PackageVersionTableItem } from '../src/types';

// Mock the packageDynamoService
jest.mock('../src/services/dynamoServices', () => ({
    packageDynamoService: {
        getPackageByName: jest.fn(),
        getAllPackages: jest.fn(),
        getPackageVersions: jest.fn()
    }
}));

describe('SearchService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('listPackages', () => {
        const mockPackages: PackageTableItem[] = [
            {
                package_id: 'test-id-1',
                name: 'test-package-1',
                latest_version: '1.0.0',
                created_at: new Date().toISOString(),
                user_id: 'user123',
                description: 'Test package 1'
            },
            {
                package_id: 'test-id-2',
                name: 'test-package-2',
                latest_version: '2.0.0',
                created_at: new Date().toISOString(),
                user_id: 'user123',
                description: 'Test package 2'
            }
        ];

        it('should return all packages when no offset is provided', async () => {
            (packageDynamoService.getAllPackages as jest.Mock).mockResolvedValue(mockPackages);

            const result = await SearchService.listPackages();

            expect(result).toEqual(mockPackages.map(pkg => ({
                Name: pkg.name,
                ID: pkg.package_id,
                Version: pkg.latest_version
            })));
            expect(packageDynamoService.getAllPackages).toHaveBeenCalledWith(undefined);
        });

        it('should use offset for pagination when provided', async () => {
            (packageDynamoService.getAllPackages as jest.Mock).mockResolvedValue([mockPackages[1]]);

            const result = await SearchService.listPackages('test-id-1');

            expect(result).toEqual([{
                Name: mockPackages[1].name,
                ID: mockPackages[1].package_id,
                Version: mockPackages[1].latest_version
            }]);
            expect(packageDynamoService.getAllPackages).toHaveBeenCalledWith('test-id-1');
        });

        it('should handle empty result', async () => {
            (packageDynamoService.getAllPackages as jest.Mock).mockResolvedValue([]);

            const result = await SearchService.listPackages();

            expect(result).toEqual([]);
            expect(packageDynamoService.getAllPackages).toHaveBeenCalledWith(undefined);
        });

        it('should handle undefined version', async () => {
            const packagesWithoutVersion = [{
                ...mockPackages[0],
                latest_version: undefined
            }];
            (packageDynamoService.getAllPackages as jest.Mock).mockResolvedValue(packagesWithoutVersion);

            const result = await SearchService.listPackages();

            expect(result).toEqual([{
                Name: mockPackages[0].name,
                ID: mockPackages[0].package_id,
                Version: '0.0.0'
            }]);
        });

        it('should handle errors', async () => {
            const error = new Error('DynamoDB error');
            (packageDynamoService.getAllPackages as jest.Mock).mockRejectedValue(error);

            await expect(SearchService.listPackages()).rejects.toThrow('DynamoDB error');
        });
    });

    describe('searchPackages', () => {
        const mockPackage: PackageTableItem = {
            package_id: 'test-id-123',
            name: 'test-package',
            latest_version: '1.0.0',
            created_at: new Date().toISOString(),
            user_id: 'user123',
            description: 'Test package description'
        };

        const mockVersions: PackageVersionTableItem[] = [
            {
                version_id: 'v1',
                package_id: 'test-id-123',
                version: '1.0.0',
                name: 'test-package',
                zip_file_path: 'path/to/zip',
                debloated: false,
                created_at: new Date().toISOString(),
                standalone_cost: 100,
                total_cost: 100
            },
            {
                version_id: 'v2',
                package_id: 'test-id-123',
                version: '1.1.0',
                name: 'test-package',
                zip_file_path: 'path/to/zip',
                debloated: false,
                created_at: new Date().toISOString(),
                standalone_cost: 100,
                total_cost: 100
            }
        ];

        it('should return all packages when wildcard query is used', async () => {
            (packageDynamoService.getAllPackages as jest.Mock).mockResolvedValue([mockPackage]);

            const result = await SearchService.searchPackages([{ Name: '*' }]);

            expect(result).toEqual([{
                Name: mockPackage.name,
                ID: mockPackage.package_id,
                Version: mockPackage.latest_version
            }]);
        });

        it('should return package when exact match is found', async () => {
            (packageDynamoService.getPackageByName as jest.Mock).mockResolvedValue(mockPackage);

            const result = await SearchService.searchPackages([{ Name: 'test-package' }]);

            expect(result).toEqual([{
                Name: mockPackage.name,
                ID: mockPackage.package_id,
                Version: mockPackage.latest_version
            }]);
        });

        it('should handle version constraints', async () => {
            (packageDynamoService.getPackageByName as jest.Mock).mockResolvedValue(mockPackage);
            (packageDynamoService.getPackageVersions as jest.Mock).mockResolvedValue(mockVersions);

            const result = await SearchService.searchPackages([
                { Name: 'test-package', Version: '^1.0.0' }
            ]);

            expect(result).toEqual([{
                Name: mockPackage.name,
                ID: mockPackage.package_id,
                Version: '1.1.0' // Should return latest matching version
            }]);
        });

        it('should handle multiple queries', async () => {
            const mockPackage2 = { ...mockPackage, package_id: 'test-id-456', name: 'other-package' };
            (packageDynamoService.getPackageByName as jest.Mock)
                .mockResolvedValueOnce(mockPackage)
                .mockResolvedValueOnce(mockPackage2);

            const result = await SearchService.searchPackages([
                { Name: 'test-package' },
                { Name: 'other-package' }
            ]);

            expect(result).toHaveLength(2);
            expect(result).toContainEqual({
                Name: mockPackage.name,
                ID: mockPackage.package_id,
                Version: mockPackage.latest_version
            });
            expect(result).toContainEqual({
                Name: mockPackage2.name,
                ID: mockPackage2.package_id,
                Version: mockPackage2.latest_version
            });
        });

        it('should handle no matches', async () => {
            (packageDynamoService.getPackageByName as jest.Mock).mockResolvedValue(null);

            const result = await SearchService.searchPackages([
                { Name: 'non-existent-package' }
            ]);

            expect(result).toEqual([]);
        });

        it('should handle errors', async () => {
            const error = new Error('DynamoDB error');
            (packageDynamoService.getPackageByName as jest.Mock).mockRejectedValue(error);

            await expect(SearchService.searchPackages([
                { Name: 'test-package' }
            ])).rejects.toThrow('DynamoDB error');
        });
    });
});
