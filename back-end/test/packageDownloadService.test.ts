import { PackageDownloadService } from '../src/services/packageDownloadService';
import { DynamoDBService } from '../src/services/dynamoDBService';
import { S3Service } from '../src/services/s3Service';
import { Package } from '../src/types';

jest.mock('../src/services/dynamoDBService');
jest.mock('../src/services/s3Service');
jest.mock('../src/logger');

describe('PackageDownloadService', () => {
    let service: PackageDownloadService;
    let mockDynamoDBService: jest.Mocked<DynamoDBService>;
    let mockS3Service: jest.Mocked<S3Service>;

    beforeEach(() => {
        mockDynamoDBService = {
            getPackageById: jest.fn(),
            recordDownload: jest.fn()
        } as unknown as jest.Mocked<DynamoDBService>;

        mockS3Service = {
            getPackageContent: jest.fn()
        } as unknown as jest.Mocked<S3Service>;

        service = new PackageDownloadService();
        (service as any).db = mockDynamoDBService;
        (service as any).s3Service = mockS3Service;
    });

    describe('getPackageById', () => {
        const mockPackage: Package = {
            metadata: {
                Name: 'test-package',
                Version: '1.0.0',
                ID: '123'
            },
            data: {
                Content: 's3://bucket/path'
            }
        };

        it('should get package successfully', async () => {
            const mockContent = Buffer.from('test content');
            mockDynamoDBService.getPackageById.mockResolvedValue(mockPackage);
            mockS3Service.getPackageContent.mockResolvedValue(mockContent);

            const result = await service.getPackageById('123', 'user123');

            expect(result).toEqual({
                metadata: mockPackage.metadata,
                data: {
                    Content: mockContent.toString('base64')
                }
            });

            expect(mockDynamoDBService.recordDownload).toHaveBeenCalledWith(expect.objectContaining({
                package_id: '123',
                user_id: 'user123',
                version: '1.0.0'
            }));
        });

        it('should throw error if package not found', async () => {
            mockDynamoDBService.getPackageById.mockResolvedValue(null);

            await expect(service.getPackageById('123', 'user123'))
                .rejects.toThrow('Package not found');
        });

        it('should throw error if content not found', async () => {
            const packageWithoutContent: Package = {
                metadata: mockPackage.metadata,
                data: {}
            };
            mockDynamoDBService.getPackageById.mockResolvedValue(packageWithoutContent);

            await expect(service.getPackageById('123', 'user123'))
                .rejects.toThrow('Package content not found');
        });
    });
});
