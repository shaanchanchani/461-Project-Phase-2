import { PackageDownloadService } from '../src/services/packageDownloadService';
import { downloadDynamoService, packageDynamoService } from '../src/services/dynamoServices';
import { S3Service } from '../src/services/s3Service';
import { Package } from '../src/types';

// Mock the logger first to prevent process.exit
jest.mock('../src/logger', () => ({
    log: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

// Mock the services
const mockGetPackageContent = jest.fn();
jest.mock('../src/services/s3Service', () => {
    return {
        S3Service: jest.fn().mockImplementation(() => ({
            getPackageContent: mockGetPackageContent
        }))
    };
});

jest.mock('../src/services/dynamoServices', () => ({
    downloadDynamoService: {
        recordDownload: jest.fn()
    },
    packageDynamoService: {
        getPackageById: jest.fn()
    }
}));

describe('PackageDownloadService', () => {
    let packageDownloadService: PackageDownloadService;

    beforeEach(() => {
        jest.clearAllMocks();
        packageDownloadService = new PackageDownloadService();
    });

    describe('getPackageById', () => {
        const mockPackage: Package = {
            metadata: {
                Name: 'test-package',
                Version: '1.0.0',
                ID: '123'
            },
            data: {
                Content: 'test-content'
            }
        };

        it('should get package successfully', async () => {
            const mockContent = Buffer.from('test content').toString('base64');
            (packageDynamoService.getPackageById as jest.Mock).mockResolvedValue(mockPackage);
            mockGetPackageContent.mockResolvedValue(mockContent);

            const result = await packageDownloadService.getPackageById('123', 'user123');

            expect(result).toEqual({
                metadata: mockPackage.metadata,
                data: {
                    Content: mockContent
                }
            });

            expect(downloadDynamoService.recordDownload).toHaveBeenCalledWith(expect.objectContaining({
                package_id: '123',
                user_id: 'user123',
                version: '1.0.0'
            }));
        });

        it('should throw error if package not found', async () => {
            (packageDynamoService.getPackageById as jest.Mock).mockResolvedValue(null);

            await expect(packageDownloadService.getPackageById('123', 'user123'))
                .rejects.toThrow('Package not found');
        });

        it('should throw error if package content not found', async () => {
            const packageWithoutContent = {
                metadata: mockPackage.metadata,
                data: {}
            };
            (packageDynamoService.getPackageById as jest.Mock).mockResolvedValue(packageWithoutContent);

            await expect(packageDownloadService.getPackageById('123', 'user123'))
                .rejects.toThrow('Package content not found');
        });
    });
});
