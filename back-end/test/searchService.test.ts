import { SearchService } from '../src/services/searchService';
import { packageDynamoService } from '../src/services/dynamoServices';
import type { PackageTableItem } from '../src/types';

// Mock the packageDynamoService
jest.mock('../src/services/dynamoServices', () => ({
    packageDynamoService: {
        getPackageByName: jest.fn(),
        getAllPackages: jest.fn()
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

    describe('searchByName', () => {
        const mockPackage: PackageTableItem = {
            package_id: 'test-id-123',
            name: 'test-package',
            latest_version: '1.0.0',
            created_at: new Date().toISOString(),
            user_id: 'user123',
            description: 'Test package description'
        };

        it('should return package when exact match is found', async () => {
            (packageDynamoService.getPackageByName as jest.Mock).mockResolvedValue(mockPackage);

            const result = await SearchService.searchByName('test-package');

            expect(result).toEqual([{
                Name: mockPackage.name,
                ID: mockPackage.package_id,
                Version: mockPackage.latest_version
            }]);
            expect(packageDynamoService.getPackageByName).toHaveBeenCalledWith('test-package');
        });

        it('should return empty array when no match is found', async () => {
            (packageDynamoService.getPackageByName as jest.Mock).mockResolvedValue(null);

            const result = await SearchService.searchByName('non-existent-package');

            expect(result).toEqual([]);
            expect(packageDynamoService.getPackageByName).toHaveBeenCalledWith('non-existent-package');
        });

        it('should handle case sensitivity correctly', async () => {
            (packageDynamoService.getPackageByName as jest.Mock).mockResolvedValue(null);

            const result = await SearchService.searchByName('TEST-PACKAGE');

            expect(result).toEqual([]);
            expect(packageDynamoService.getPackageByName).toHaveBeenCalledWith('TEST-PACKAGE');
        });

        it('should handle undefined version', async () => {
            const packageWithoutVersion = { ...mockPackage, latest_version: undefined };
            (packageDynamoService.getPackageByName as jest.Mock).mockResolvedValue(packageWithoutVersion);

            const result = await SearchService.searchByName('test-package');

            expect(result).toEqual([{
                Name: packageWithoutVersion.name,
                ID: packageWithoutVersion.package_id,
                Version: '0.0.0'
            }]);
        });

        it('should handle error from DynamoDB', async () => {
            const error = new Error('DynamoDB error');
            (packageDynamoService.getPackageByName as jest.Mock).mockRejectedValue(error);

            await expect(SearchService.searchByName('test-package')).rejects.toThrow('DynamoDB error');
        });

        it('should handle empty string search', async () => {
            const result = await SearchService.searchByName('');

            expect(result).toEqual([]);
            expect(packageDynamoService.getPackageByName).not.toHaveBeenCalled();
        });
    });
});
