import { PackageDynamoService, packageDynamoService } from './dynamoServices';
import { PackageUploadService } from './packageUploadService';
import { log } from '../logger';
import { PackageTableItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { metricService } from './metricService';
import AdmZip from 'adm-zip';
import { UrlType, checkUrlType } from '../utils/urlUtils';

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
        metadata: { Version: string; ID: string; Name: string },
        data: { URL?: string; Content?: string; JSProgram?: string },
        userId: string
    ) {
        log.info('Updating package', { packageId, metadata, userId });

        // Validate inputs - either URL or Content must be provided
        if (!data.URL && !data.Content) {
            throw new Error('Either URL or Content is required for package update');
        }
        if (data.URL && data.Content) {
            throw new Error('Cannot provide both URL and Content for package update');
        }

        // Get the package by ID
        const existingPackage = await this.packageDynamoService.getRawPackageById(packageId);
        if (!existingPackage) {
            throw new Error('Package not found');
        }

        // Check authorization
        if (existingPackage.user_id !== userId) {
            throw new Error('Unauthorized to update this package');
        }

        // Validate package name matches
        if (existingPackage.name !== metadata.Name) {
            throw new Error('Package name cannot be changed during update');
        }

        // Compare versions
        if (!this.isNewerVersion(metadata.Version, existingPackage.latest_version)) {
            throw new Error('New version must be greater than current version');
        }

        try {
            let zipBuffer: Buffer;
            let base64Content: string;
            let metricsUrl: string;

            // Process either URL or Content
            if (data.URL) {
                // Handle URL update
                const result = await this.packageUploadService.fetchAndZipPackage(data.URL);
                zipBuffer = result.zipBuffer;
                base64Content = result.base64Content;
                metricsUrl = data.URL;
            } else {
                // Handle ZIP content update
                zipBuffer = Buffer.from(data.Content!, 'base64');
                base64Content = data.Content!;

                // Extract repository URL from package.json in the zip
                const zip = new AdmZip(zipBuffer);
                const packageJsonEntry = this.packageUploadService.findPackageJson(zip);
                if (!packageJsonEntry) {
                    throw new Error('ZIP archive must contain a valid package.json file');
                }

                let packageJson;
                try {
                    packageJson = JSON.parse(packageJsonEntry.getData().toString());
                } catch (error) {
                    throw new Error('Invalid package.json: not valid JSON');
                }

                // Extract and validate repository URL
                metricsUrl = await this.packageUploadService.extractRepositoryUrl(zip);
                const urlType = checkUrlType(metricsUrl);
                if (urlType === UrlType.Invalid) {
                    throw new Error('Invalid repository URL format in package.json');
                }

                // Convert npm URLs to GitHub URLs for metrics
                if (urlType === UrlType.npm) {
                    metricsUrl = await this.packageUploadService.handleNpmUrl(metricsUrl);
                }
            }

            // Generate new IDs
            const newPackageId = uuidv4();
            const versionId = uuidv4();

            // Upload to S3
            const s3Key = `packages/${newPackageId}/content.zip`;
            await this.packageUploadService.s3Service.uploadPackageContent(s3Key, zipBuffer);
            const packageSize = await this.packageUploadService.s3Service.getPackageSize(newPackageId);

            // Update package with new version
            await this.packageDynamoService.updatePackageLatestVersion(
                existingPackage.name,
                metadata.Version,
                newPackageId
            );

            // Create new version entry
            const versionData = {
                version_id: versionId,
                package_id: newPackageId,
                version: metadata.Version,
                zip_file_path: s3Key,
                debloated: false,
                created_at: new Date().toISOString(),
                standalone_cost: packageSize,
                total_cost: packageSize
            };
            await this.packageDynamoService.createPackageVersion(versionData);

            // Get and store metrics
            const metrics = await this.packageUploadService.checkPackageMetrics(metricsUrl);
            await metricService.createMetricEntry(versionId, metrics);

            return {
                metadata: {
                    Name: metadata.Name,
                    Version: metadata.Version,
                    ID: newPackageId
                },
                data: {
                    Content: base64Content,
                    URL: data.URL || '',
                    JSProgram: data.JSProgram || ''
                }
            };
        } catch (error) {
            log.error('Error during package update', { error });
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
