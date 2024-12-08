import { PackageUpdateService } from '../src/services/packageUpdateService';
import { PackageDynamoService } from '../src/services/dynamoServices/packageDynamoService';
import { PackageUploadService } from '../src/services/packageUploadService';
import { PackageTableItem } from '../src/types';

jest.mock('../src/services/dynamoServices/packageDynamoService');
jest.mock('../src/services/packageUploadService');

describe('PackageUpdateService', () => {
    let packageUpdateService: PackageUpdateService;
    let mockPackageDynamoService: jest.Mocked<PackageDynamoService>;
    let mockPackageUploadService: jest.Mocked<PackageUploadService>;

    const mockUserId = 'test-user-id';
    const mockPackageId = 'test-package';
    const mockMetadata = {
        Version: '1.0.0',
        ID: mockPackageId,
        Name: 'Test Package'
    };
    const mockData = {
        Content: 'test-content',
        JSProgram: 'console.log("test")'
    };

    const mockPackage: PackageTableItem = {
        package_id: mockPackageId,
        name: 'Test Package',
        latest_version: '0.9.0',
        user_id: mockUserId,
        created_at: new Date().toISOString(),
        description: 'Test package description'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockPackageDynamoService = new PackageDynamoService() as jest.Mocked<PackageDynamoService>;
        mockPackageUploadService = new PackageUploadService() as jest.Mocked<PackageUploadService>;
        packageUpdateService = new PackageUpdateService(
            mockPackageDynamoService,
            mockPackageUploadService
        );

        // Default mock responses
        mockPackageDynamoService.getRawPackageById.mockResolvedValue(mockPackage);
        mockPackageUploadService.uploadPackageFromZip.mockResolvedValue({ metadata: mockMetadata, data: mockData });
    });

    describe('updatePackage', () => {
        it('should throw error for invalid package ID format', async () => {
            await expect(
                packageUpdateService.updatePackage('invalid@id', mockMetadata, mockData, mockUserId)
            ).rejects.toThrow('Invalid package ID format');
        });

        it('should throw error if package does not exist', async () => {
            mockPackageDynamoService.getRawPackageById.mockResolvedValue(null);

            await expect(
                packageUpdateService.updatePackage(mockPackageId, mockMetadata, mockData, mockUserId)
            ).rejects.toThrow('Package not found');
        });

        it('should throw error if user is not authorized', async () => {
            const unauthorizedUser = 'unauthorized-user';
            await expect(
                packageUpdateService.updatePackage(mockPackageId, mockMetadata, mockData, unauthorizedUser)
            ).rejects.toThrow('Unauthorized to update this package');
        });

        it('should throw error if version is not newer', async () => {
            const sameVersionPackage = {
                ...mockPackage,
                latest_version: mockMetadata.Version
            };
            mockPackageDynamoService.getRawPackageById.mockResolvedValue(sameVersionPackage);

            await expect(
                packageUpdateService.updatePackage(mockPackageId, mockMetadata, mockData, mockUserId)
            ).rejects.toThrow('New version must be greater than current version');
        });

        it('should throw error if upload fails', async () => {
            mockPackageUploadService.uploadPackageFromZip.mockRejectedValue(new Error('Upload failed'));

            await expect(
                packageUpdateService.updatePackage(mockPackageId, mockMetadata, mockData, mockUserId)
            ).rejects.toThrow('Failed to update package: Upload failed');
        });

        it('should throw error if package name is changed', async () => {
            const differentNameMetadata = {
                ...mockMetadata,
                Name: 'Different Name'
            };

            await expect(
                packageUpdateService.updatePackage(mockPackageId, differentNameMetadata, mockData, mockUserId)
            ).rejects.toThrow('Package name cannot be changed during update');
        });
    });
});
