import { PackageUpdateService } from '../src/services/packageUpdateService';
import { PackageDynamoService } from '../src/services/dynamoServices/packageDynamoService';
import { PackageUploadService } from '../src/services/packageUploadService';
import { PackageTableItem, PackageUploadResponse } from '../src/types';

jest.mock('../src/services/dynamoServices/packageDynamoService');
jest.mock('../src/services/packageUploadService');

describe('PackageUpdateService', () => {
    let packageUpdateService: PackageUpdateService;
    let mockPackageDynamoService: jest.Mocked<PackageDynamoService>;
    let mockPackageUploadService: jest.Mocked<PackageUploadService>;

    const mockUserId = 'test-user-id';
    const mockPackageId = 'test-package';
    const mockMetadata = {
        Name: 'Test Package',
        Version: '2.0.0',
        ID: mockPackageId
    };
    const mockContent = 'base64-encoded-content';
    const mockUrl = 'https://example.com/package.zip';
    const mockJSProgram = 'console.log("test")';

    const mockExistingPackage: PackageTableItem = {
        package_id: mockPackageId,
        name: 'Test Package',
        latest_version: '1.0.0',
        user_id: mockUserId,
        created_at: new Date().toISOString(),
        description: 'Test package description'
    };

    const mockUploadResponse: PackageUploadResponse = {
        metadata: mockMetadata,
        data: {
            Content: mockContent,
            JSProgram: mockJSProgram
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockPackageDynamoService = new PackageDynamoService() as jest.Mocked<PackageDynamoService>;
        mockPackageUploadService = new PackageUploadService() as jest.Mocked<PackageUploadService>;
        packageUpdateService = new PackageUpdateService(
            mockPackageDynamoService,
            mockPackageUploadService
        );
    });

    // Test Case 1: Basic successful update with Content
    it('should successfully update package with new content', async () => {
        mockPackageDynamoService.getRawPackageById.mockResolvedValue(mockExistingPackage);
        mockPackageUploadService.uploadPackageFromZip.mockResolvedValue(mockUploadResponse);

        const result = await packageUpdateService.updatePackage(
            mockPackageId,
            mockMetadata,
            { Content: mockContent, JSProgram: mockJSProgram },
            mockUserId
        );

        expect(result).toBeDefined();
        expect(mockPackageDynamoService.getRawPackageById).toHaveBeenCalledWith(mockPackageId);
        expect(mockPackageUploadService.uploadPackageFromZip).toHaveBeenCalledWith(
            mockContent,
            mockJSProgram,
            false,
            mockUserId
        );
    });

    // Test Case 2: Basic successful update with URL
    it('should successfully update package with new URL', async () => {
        mockPackageDynamoService.getRawPackageById.mockResolvedValue(mockExistingPackage);
        mockPackageUploadService.uploadPackageFromUrl.mockResolvedValue(mockUploadResponse);

        const result = await packageUpdateService.updatePackage(
            mockPackageId,
            mockMetadata,
            { URL: mockUrl, JSProgram: mockJSProgram },
            mockUserId
        );

        expect(result).toBeDefined();
        expect(mockPackageDynamoService.getRawPackageById).toHaveBeenCalledWith(mockPackageId);
        expect(mockPackageUploadService.uploadPackageFromUrl).toHaveBeenCalledWith(
            mockUrl,
            mockJSProgram,
            false,
            mockUserId
        );
    });

    // Test Case 3: Package not found
    it('should fail when package does not exist', async () => {
        mockPackageDynamoService.getRawPackageById.mockResolvedValue(null);

        await expect(
            packageUpdateService.updatePackage(
                mockPackageId,
                mockMetadata,
                { Content: mockContent },
                mockUserId
            )
        ).rejects.toThrow('Package not found');
    });

    // Test Case 4: Unauthorized update attempt
    it('should fail when user is not the owner', async () => {
        const unauthorizedPackage = {
            ...mockExistingPackage,
            user_id: 'different-user-id'
        };

        mockPackageDynamoService.getRawPackageById.mockResolvedValue(unauthorizedPackage);

        await expect(
            packageUpdateService.updatePackage(
                mockPackageId,
                mockMetadata,
                { Content: mockContent },
                mockUserId
            )
        ).rejects.toThrow('Unauthorized to update this package');
    });

    // Test Case 5: Version downgrade attempt
    it('should fail when trying to downgrade version', async () => {
        const newerVersionPackage = {
            ...mockExistingPackage,
            latest_version: '2.0.0'
        };

        mockPackageDynamoService.getRawPackageById.mockResolvedValue(newerVersionPackage);

        await expect(
            packageUpdateService.updatePackage(
                mockPackageId,
                { ...mockMetadata, Version: '1.0.0' },
                { Content: mockContent },
                mockUserId
            )
        ).rejects.toThrow('New version must be greater than current version');
    });

    // Test Case 6: Missing required fields
    it('should fail when metadata is missing required fields', async () => {
        await expect(
            packageUpdateService.updatePackage(
                mockPackageId,
                { Version: '2.0.0', ID: mockPackageId } as any,
                { Content: mockContent },
                mockUserId
            )
        ).rejects.toThrow('Metadata must include Version, ID, and Name fields');
    });

    // Test Case 7: Mismatched package ID
    it('should fail when metadata ID does not match package ID', async () => {
        await expect(
            packageUpdateService.updatePackage(
                mockPackageId,
                { ...mockMetadata, ID: 'different-id' },
                { Content: mockContent },
                mockUserId
            )
        ).rejects.toThrow('Package ID in metadata must match URL parameter');
    });

    // Test Case 8: Name change attempt
    it('should fail when trying to change package name', async () => {
        const existingPackage = {
            ...mockExistingPackage,
            name: 'Original Name'
        };

        mockPackageDynamoService.getRawPackageById.mockResolvedValue(existingPackage);

        await expect(
            packageUpdateService.updatePackage(
                mockPackageId,
                { ...mockMetadata, Name: 'New Name' },
                { Content: mockContent },
                mockUserId
            )
        ).rejects.toThrow('Package name cannot be changed during update');
    });

    // Test Case 9: Upload failure
    it('should handle package upload failure', async () => {
        mockPackageDynamoService.getRawPackageById.mockResolvedValue(mockExistingPackage);
        mockPackageUploadService.uploadPackageFromZip.mockRejectedValue(new Error('Upload failed'));

        await expect(
            packageUpdateService.updatePackage(
                mockPackageId,
                mockMetadata,
                { Content: mockContent },
                mockUserId
            )
        ).rejects.toThrow('Failed to update package: Upload failed');
    });
});
