import { costService } from '../src/services/costService';
import { dynamoDBService } from '../src/services/dynamoDBService';
import { PackageVersionTableItem } from '../src/types';

// Mock the dynamoDB service
jest.mock('../src/services/dynamoDBService', () => ({
    dynamoDBService: {
        getLatestPackageVersion: jest.fn()
    }
}));

describe('CostService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculatePackageCost', () => {
        it('should calculate standalone cost correctly', async () => {
            const mockVersion: PackageVersionTableItem = {
                version_id: 'v1',
                package_id: 'test-pkg-123',
                version: '1.0.0',
                zip_file_path: 's3://test/path',
                debloated: false,
                created_at: new Date().toISOString(),
                standalone_cost: 1048576, // 1 MB in bytes
                total_cost: 1048576
            };

            (dynamoDBService.getLatestPackageVersion as jest.Mock).mockResolvedValueOnce(mockVersion);

            const result = await costService.calculatePackageCost('test-pkg-123', false);

            expect(result).toEqual({
                'test-pkg-123': {
                    standaloneCost: 1.0,  // 1MB
                    totalCost: 1.0        // Same as standalone since dependencies not included
                }
            });
        });

        it('should handle package not found', async () => {
            (dynamoDBService.getLatestPackageVersion as jest.Mock).mockResolvedValueOnce(null);

            await expect(costService.calculatePackageCost('nonexistent', false))
                .rejects.toThrow('Package not found');
        });

        it('should calculate total cost with dependencies', async () => {
            const mockVersion: PackageVersionTableItem = {
                version_id: 'v1',
                package_id: 'test-pkg-123',
                version: '1.0.0',
                zip_file_path: 's3://test/path',
                debloated: false,
                created_at: new Date().toISOString(),
                standalone_cost: 1048576,    // 1 MB in bytes
                total_cost: 2097152         // 2 MB in bytes (including dependencies)
            };

            (dynamoDBService.getLatestPackageVersion as jest.Mock).mockResolvedValueOnce(mockVersion);

            const result = await costService.calculatePackageCost('test-pkg-123', true);

            expect(result).toEqual({
                'test-pkg-123': {
                    standaloneCost: 1.0,  // 1MB
                    totalCost: 2.0        // 2MB with dependencies
                }
            });
        });

        it('should handle missing costs in version data', async () => {
            const mockVersion: PackageVersionTableItem = {
                version_id: 'v1',
                package_id: 'test-pkg-123',
                version: '1.0.0',
                zip_file_path: 's3://test/path',
                debloated: false,
                created_at: new Date().toISOString(),
                standalone_cost: 0,
                total_cost: 0
            };

            (dynamoDBService.getLatestPackageVersion as jest.Mock).mockResolvedValueOnce(mockVersion);

            const result = await costService.calculatePackageCost('test-pkg-123', true);

            expect(result).toEqual({
                'test-pkg-123': {
                    standaloneCost: 0.0,
                    totalCost: 0.0
                }
            });
        });
    });
});
