import { PackageUpdateService } from '../src/services/packageUpdateService';
import { PackageDynamoService } from '../src/services/dynamoServices/packageDynamoService';
import { PackageUploadService } from '../src/services/packageUploadService';
import { PackageTableItem, PackageUpdateMetadata, PackageUpdateData } from '../src/types';
import AdmZip from 'adm-zip';

jest.mock('../src/services/dynamoServices/packageDynamoService');
jest.mock('../src/services/packageUploadService');

describe('PackageUpdateService', () => {
    let packageUpdateService: PackageUpdateService;
    let mockPackageDynamoService: jest.Mocked<PackageDynamoService>;
    let mockPackageUploadService: jest.Mocked<PackageUploadService>;

    const mockUserId = 'test-user-id';
    const mockPackageId = 'test-package';
    const mockMetadata: PackageUpdateMetadata = {
        Name: 'Test Package',
        Version: '2.0.0',
        ID: mockPackageId
    };

    const mockExistingPackage: PackageTableItem = {
        package_id: mockPackageId,
        name: 'Test Package',
        latest_version: '1.0.0',
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

        // Mock methods
        mockPackageDynamoService.getRawPackageById.mockResolvedValue(mockExistingPackage);
        mockPackageUploadService.findPackageJson.mockReturnValue({
            entryName: 'package.json',
            rawEntryName: Buffer.from('package.json'),
            extra: Buffer.alloc(0),
            comment: '',
            name: 'package.json',
            isDirectory: false,
            header: Buffer.alloc(0),
            attr: 0,
            offset: 0,
            header_offset: 0,
            dataOffset: 0,
            getCompressedData: () => Buffer.alloc(0),
            getLastModDate: () => new Date(),
            setLastModDate: () => {},
            isEncrypted: () => false,
            getData: () => Buffer.from(JSON.stringify({ name: 'test-package' }))
        } as any);
        mockPackageUploadService.s3Service = {
            uploadPackageContent: jest.fn().mockResolvedValue(undefined),
            getPackageSize: jest.fn().mockResolvedValue(1000)
        } as any;
    });

    // Test Case 1: Basic successful update with Content
    it('should successfully update package with new content', async () => {
        const mockData: PackageUpdateData = {
            Content: Buffer.from('test-content').toString('base64')
        };

        mockPackageDynamoService.createPackageVersion.mockResolvedValue(undefined);

        const result = await packageUpdateService.updatePackage(
            mockPackageId,
            mockMetadata,
            mockData,
            mockUserId
        );

        expect(result).toBeDefined();
        expect(result.metadata.Version).toBe(mockMetadata.Version);
        expect(mockPackageDynamoService.getRawPackageById).toHaveBeenCalledWith(mockPackageId);
        expect(mockPackageDynamoService.createPackageVersion).toHaveBeenCalled();
    });

    // Test Case 2: Basic successful update with URL
    it('should successfully update package with new URL', async () => {
        const mockData: PackageUpdateData = {
            URL: 'https://github.com/test/repo'
        };

        const mockZipBuffer = Buffer.from('test-content');
        mockPackageUploadService.fetchAndZipPackage.mockResolvedValue({
            zipBuffer: mockZipBuffer,
            base64Content: mockZipBuffer.toString('base64')
        });

        const result = await packageUpdateService.updatePackage(
            mockPackageId,
            mockMetadata,
            mockData,
            mockUserId
        );

        expect(result).toBeDefined();
        expect(result.metadata.Version).toBe(mockMetadata.Version);
        expect(mockPackageUploadService.fetchAndZipPackage).toHaveBeenCalledWith(mockData.URL);
    });

    // Test Case 3: Package not found
    it('should fail when package does not exist', async () => {
        mockPackageDynamoService.getRawPackageById.mockResolvedValue(null);

        await expect(packageUpdateService.updatePackage(
            mockPackageId,
            mockMetadata,
            { Content: 'test-content' },
            mockUserId
        )).rejects.toThrow('Package not found');
    });

    // Test Case 4: Version downgrade attempt
    it('should fail when trying to downgrade version', async () => {
        const mockDataDowngrade: PackageUpdateData = {
            Content: Buffer.from('test-content').toString('base64')
        };

        const mockMetadataDowngrade: PackageUpdateMetadata = {
            ...mockMetadata,
            Version: '0.9.0'
        };

        await expect(packageUpdateService.updatePackage(
            mockPackageId,
            mockMetadataDowngrade,
            mockDataDowngrade,
            mockUserId
        )).rejects.toThrow('New version must be greater than current version');
    });

    // Test Case 5: Invalid version format
    it('should fail with invalid version format', async () => {
        const mockDataInvalid: PackageUpdateData = {
            Content: Buffer.from('test-content').toString('base64')
        };

        const mockMetadataInvalid: PackageUpdateMetadata = {
            ...mockMetadata,
            Version: 'invalid'
        };

        await expect(packageUpdateService.updatePackage(
            mockPackageId,
            mockMetadataInvalid,
            mockDataInvalid,
            mockUserId
        )).rejects.toThrow('Invalid version format');
    });

    // Test Case 6: Missing both URL and Content
    it('should fail when neither URL nor Content is provided', async () => {
        const mockDataEmpty: PackageUpdateData = {};

        await expect(packageUpdateService.updatePackage(
            mockPackageId,
            mockMetadata,
            mockDataEmpty,
            mockUserId
        )).rejects.toThrow('Either URL or Content must be provided');
    });
});
