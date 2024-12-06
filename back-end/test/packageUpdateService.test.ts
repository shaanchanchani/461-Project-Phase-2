import { PackageUpdateService } from '../src/services/packageUpdateService';
import { PackageDynamoService } from '../src/services/dynamoServices';
import { PackageUploadService } from '../src/services/packageUploadService';

jest.mock('../src/services/dynamoServices');
jest.mock('../src/services/packageUploadService');

describe('PackageUpdateService', () => {
    let packageUpdateService: PackageUpdateService;
    let mockDynamoService: jest.Mocked<PackageDynamoService>;
    let mockUploadService: jest.Mocked<PackageUploadService>;

    const mockUserId = 'test-user-id';
    const mockPackageId = 'test-package';
    const mockExistingPackage = {
        package_id: mockPackageId,
        user_id: mockUserId,
        latest_version: '1.0.0',
        name: 'test-package',
        description: 'Test package for unit tests',
        created_at: new Date().toISOString()
    };

    const mockUploadResponse = {
        metadata: {
            Name: 'test-package',
            Version: '1.1.0',
            ID: mockPackageId
        },
        data: {
            Content: Buffer.from('test').toString('base64')
        }
    };

    beforeEach(() => {
        mockDynamoService = {
            getRawPackageById: jest.fn(),
        } as any;

        mockUploadService = {
            uploadPackageFromUrl: jest.fn(),
            uploadPackageFromZip: jest.fn(),
        } as any;

        packageUpdateService = new PackageUpdateService(
            mockDynamoService,
            mockUploadService
        );
    });

    describe('updatePackage', () => {
        it('should successfully update package with URL', async () => {
            const metadata = { Version: '1.1.0', ID: mockPackageId };
            const data = { URL: 'https://example.com/package.zip', JSProgram: 'console.log("test")' };
            const expectedResult = mockUploadResponse;

            mockDynamoService.getRawPackageById.mockResolvedValue(mockExistingPackage);
            mockUploadService.uploadPackageFromUrl.mockResolvedValue(expectedResult);

            const result = await packageUpdateService.updatePackage(
                mockPackageId,
                metadata,
                data,
                mockUserId
            );

            expect(result).toEqual(expectedResult);
            expect(mockUploadService.uploadPackageFromUrl).toHaveBeenCalledWith(
                data.URL,
                data.JSProgram,
                false,
                mockUserId
            );
        });

        it('should successfully update package with Content', async () => {
            const metadata = { Version: '1.1.0', ID: mockPackageId };
            const data = { Content: 'base64content', JSProgram: 'console.log("test")' };
            const expectedResult = mockUploadResponse;

            mockDynamoService.getRawPackageById.mockResolvedValue(mockExistingPackage);
            mockUploadService.uploadPackageFromZip.mockResolvedValue(expectedResult);

            const result = await packageUpdateService.updatePackage(
                mockPackageId,
                metadata,
                data,
                mockUserId
            );

            expect(result).toEqual(expectedResult);
            expect(mockUploadService.uploadPackageFromZip).toHaveBeenCalledWith(
                data.Content,
                data.JSProgram,
                false,
                mockUserId
            );
        });

        it('should throw error for invalid package ID format', async () => {
            const metadata = { Version: '1.1.0', ID: 'invalid@id' };
            const data = { URL: 'https://example.com/package.zip' };

            await expect(
                packageUpdateService.updatePackage('invalid@id', metadata, data, mockUserId)
            ).rejects.toThrow('Invalid package ID format');
        });

        it('should throw error when package not found', async () => {
            const metadata = { Version: '1.1.0', ID: mockPackageId };
            const data = { URL: 'https://example.com/package.zip' };

            mockDynamoService.getRawPackageById.mockResolvedValue(null);

            await expect(
                packageUpdateService.updatePackage(mockPackageId, metadata, data, mockUserId)
            ).rejects.toThrow('Package not found');
        });

        it('should throw error when user is not authorized', async () => {
            const metadata = { Version: '1.1.0', ID: mockPackageId };
            const data = { URL: 'https://example.com/package.zip' };
            const unauthorizedUser = 'unauthorized-user';

            mockDynamoService.getRawPackageById.mockResolvedValue(mockExistingPackage);

            await expect(
                packageUpdateService.updatePackage(mockPackageId, metadata, data, unauthorizedUser)
            ).rejects.toThrow('Unauthorized to update this package');
        });

        it('should throw error when version is not newer', async () => {
            const metadata = { Version: '1.0.0', ID: mockPackageId };
            const data = { URL: 'https://example.com/package.zip' };

            mockDynamoService.getRawPackageById.mockResolvedValue(mockExistingPackage);

            await expect(
                packageUpdateService.updatePackage(mockPackageId, metadata, data, mockUserId)
            ).rejects.toThrow('New version must be greater than current version');
        });

        it('should throw error when both URL and Content are provided', async () => {
            const metadata = { Version: '1.1.0', ID: mockPackageId };
            const data = { 
                URL: 'https://example.com/package.zip',
                Content: 'base64content'
            };

            mockDynamoService.getRawPackageById.mockResolvedValue(mockExistingPackage);

            await expect(
                packageUpdateService.updatePackage(mockPackageId, metadata, data, mockUserId)
            ).rejects.toThrow('Must provide either URL or Content in data field, but not both');
        });

        it('should throw error when neither URL nor Content is provided', async () => {
            const metadata = { Version: '1.1.0', ID: mockPackageId };
            const data = { JSProgram: 'console.log("test")' };

            mockDynamoService.getRawPackageById.mockResolvedValue(mockExistingPackage);

            await expect(
                packageUpdateService.updatePackage(mockPackageId, metadata, data, mockUserId)
            ).rejects.toThrow('Must provide either URL or Content in data field, but not both');
        });
    });
});
