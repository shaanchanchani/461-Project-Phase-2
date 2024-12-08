import { PackageDynamoService, packageDynamoService } from './dynamoServices';
import { PackageUploadService } from './packageUploadService';
import { log } from '../logger';
import { PackageUpdateMetadata, PackageUpdateData, PackageVersionTableItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { metricService } from './metricService';
import AdmZip from 'adm-zip';
import { UrlType, checkUrlType } from '../utils/urlUtils';
import semver from 'semver';

export class PackageUpdateService {
    private packageDynamoService: PackageDynamoService;
    private packageUploadService: PackageUploadService;

    constructor(
        dynamoService: PackageDynamoService = packageDynamoService,
        uploadService: PackageUploadService = new PackageUploadService()
    ) {
        this.packageDynamoService = dynamoService;
        this.packageUploadService = uploadService;
    }

    public async updatePackage(
        packageId: string,
        metadata: PackageUpdateMetadata,
        data: PackageUpdateData,
        userId: string
    ): Promise<any> {
        try {
            // Get existing package
            const existingPackage = await this.packageDynamoService.getRawPackageById(packageId);
            if (!existingPackage) {
                throw new Error('Package not found');
            }

            // Compare versions using semver
            const newVersion = metadata.Version;
            const currentVersion = existingPackage.latest_version;

            if (!semver.valid(newVersion) || !semver.valid(currentVersion)) {
                throw new Error('Invalid version format. Must be a valid semantic version');
            }

            if (semver.lte(newVersion, currentVersion)) {
                throw new Error('New version must be greater than current version');
            }

            let packageContent: Buffer;

            if (data.URL) {
                // Handle URL update
                const { zipBuffer } = await this.packageUploadService.fetchAndZipPackage(data.URL);
                packageContent = zipBuffer;
            } else if (data.Content) {
                // Handle Content update
                packageContent = Buffer.from(data.Content, 'base64');
            } else {
                throw new Error('Either URL or Content must be provided');
            }

            // Extract and validate package.json
            const zip = new AdmZip(packageContent);
            const packageJsonEntry = this.packageUploadService.findPackageJson(zip);
            if (!packageJsonEntry) {
                throw new Error('Invalid package: package.json not found');
            }

            // Create new package version
            const newPackageId = uuidv4();
            const versionId = uuidv4();

            // Upload content to S3
            const s3Key = `packages/${newPackageId}/content.zip`;
            await this.packageUploadService.s3Service.uploadPackageContent(s3Key, packageContent);
            const packageSize = await this.packageUploadService.s3Service.getPackageSize(newPackageId);

            // Create version data
            const versionData: PackageVersionTableItem = {
                version_id: versionId,
                package_id: packageId,
                version: newVersion,
                zip_file_path: s3Key,
                debloated: false,
                created_at: new Date().toISOString(),
                standalone_cost: packageSize,
                total_cost: packageSize
            };

            // Update package with new version
            await this.packageDynamoService.createPackageVersion(versionData);

            // Get and store metrics
            const metricsUrl = data.URL || await this.packageUploadService.extractRepositoryUrl(zip);
            const metrics = await this.packageUploadService.checkPackageMetrics(metricsUrl);
            await metricService.createMetricEntry(versionId, metrics);

            return {
                metadata: {
                    Name: metadata.Name,
                    Version: newVersion,
                    ID: packageId
                }
            };
        } catch (error: any) {
            log.error(`Error in updatePackage: ${error.message}`);
            throw error;
        }
    }

    private isNewerVersion(newVersion: string, currentVersion: string): boolean {
        const normalize = (version: string) => {
            return version.split('.').map(part => part.padStart(10, '0')).join('.');
        };
        return normalize(newVersion) > normalize(currentVersion);
    }
}

export const packageUpdateService = new PackageUpdateService();
