import { PackageUpdateService } from '../src/services/packageUpdateService';
import { PackageDynamoService } from '../src/services/dynamoServices/packageDynamoService';
import { PackageUploadService } from '../src/services/packageUploadService';
import { PackageTableItem, PackageUpdateMetadata, PackageUpdateData } from '../src/types';
import AdmZip from 'adm-zip';

// Mock all required services
jest.mock('../src/services/dynamoServices/packageDynamoService');
jest.mock('../src/services/packageUploadService');
jest.mock('../src/services/metricService', () => ({
    metricService: {
        createMetricEntry: jest.fn().mockResolvedValue(undefined)
    }
}));

import { metricService } from '../src/services/metricService';

describe('PackageUpdateService', () => {
    let packageUpdateService: PackageUpdateService;
    let mockPackageDynamoService: jest.Mocked<PackageDynamoService>;
    let mockPackageUploadService: jest.Mocked<PackageUploadService>;
    
    const mockPackageId = 'test-package-id';
    const mockUserId = 'test-user-id';
    const mockMetadata: PackageUpdateMetadata = {
        ID: mockPackageId,
        Name: 'test-package',
        Version: '1.0.0'
    };

    const createValidZip = () => {
        const zip = new AdmZip();
        zip.addFile('package.json', Buffer.from(JSON.stringify({ name: 'test-package' })));
        return zip.toBuffer();
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockPackageDynamoService = new PackageDynamoService() as jest.Mocked<PackageDynamoService>;
        mockPackageUploadService = new PackageUploadService() as jest.Mocked<PackageUploadService>;
        packageUpdateService = new PackageUpdateService(
            mockPackageDynamoService,
            mockPackageUploadService
        );

        // Create a proper ZIP for testing
        const validZipBuffer = createValidZip();

        // Mock successful content update
        mockPackageUploadService.uploadPackageFromZip.mockResolvedValue({ 
            metadata: mockMetadata, 
            data: {
                Content: validZipBuffer.toString('base64'),
                JSProgram: 'console.log("test")'
            }
        });

        // Mock existing package
        mockPackageDynamoService.getRawPackageById.mockResolvedValue({
            package_id: mockPackageId,
            name: 'test-package',
            latest_version: '0.9.0',
            user_id: mockUserId,
            created_at: new Date().toISOString(),
            description: 'Test package description'
        });

        mockPackageUploadService.findPackageJson.mockReturnValue({
            entryName: 'package.json',
            getData: () => Buffer.from(JSON.stringify({ name: 'test-package' }))
        } as any);

        mockPackageUploadService.s3Service = {
            uploadPackageContent: jest.fn().mockResolvedValue(undefined),
            getPackageContent: jest.fn().mockResolvedValue(validZipBuffer),
            getPackageSize: jest.fn().mockResolvedValue(1000),
            getSignedDownloadUrl: jest.fn().mockResolvedValue(''),
            deletePackageContent: jest.fn().mockResolvedValue(undefined)
        } as any;

        mockPackageUploadService.checkPackageMetrics.mockResolvedValue({
            net_score: 0.8,
            bus_factor: 0.7,
            ramp_up: 0.6,
            responsive_maintainer: 0.9,
            license_score: 1.0,
            correctness: 0.8,
            pull_request: 0.7,
            good_pinning_practice: 0.8,
            bus_factor_latency: 100,
            ramp_up_latency: 100,
            responsive_maintainer_latency: 100,
            license_score_latency: 100,
            correctness_latency: 100,
            good_pinning_practice_latency: 100,
            pull_request_latency: 100,
            net_score_latency: 100
        });

        mockPackageDynamoService.createPackageVersion.mockResolvedValue(undefined);
        (metricService.createMetricEntry as jest.Mock).mockResolvedValue(undefined);
    });

    it('should successfully update package with new content', async () => {
        const mockData: PackageUpdateData = {
            Content: createValidZip().toString('base64')
        };

        const result = await packageUpdateService.updatePackage(
            mockPackageId,
            mockMetadata,
            mockData,
            mockUserId
        );

        expect(result).toBeDefined();
        expect(result.metadata.Version).toBe(mockMetadata.Version);
        expect(mockPackageDynamoService.createPackageVersion).toHaveBeenCalled();
        expect(metricService.createMetricEntry).toHaveBeenCalled();
    });

    it('should successfully update package with new URL', async () => {
        const mockData: PackageUpdateData = {
            URL: 'https://github.com/test/repo'
        };

        mockPackageUploadService.fetchAndZipPackage.mockResolvedValue({
            zipBuffer: createValidZip(),
            base64Content: createValidZip().toString('base64')
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
        expect(mockPackageDynamoService.createPackageVersion).toHaveBeenCalled();
        expect(metricService.createMetricEntry).toHaveBeenCalled();
    });

    it('should fail when package does not exist', async () => {
        const mockData: PackageUpdateData = {
            Content: createValidZip().toString('base64')
        };

        mockPackageDynamoService.getRawPackageById.mockResolvedValue(null);

        await expect(packageUpdateService.updatePackage(
            mockPackageId,
            mockMetadata,
            mockData,
            mockUserId
        )).rejects.toThrow('Package not found');
    });

    it('should fail when neither URL nor Content is provided', async () => {
        const mockData: PackageUpdateData = {};

        await expect(packageUpdateService.updatePackage(
            mockPackageId,
            mockMetadata,
            mockData,
            mockUserId
        )).rejects.toThrow('Either URL or Content must be provided');
    });
});