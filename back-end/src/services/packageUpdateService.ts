import { PackageDynamoService, packageDynamoService } from './dynamoServices';
import { PackageUploadService } from './packageUploadService';
import { log } from '../logger';
import { PackageTableItem } from '../types';

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

        // Validate package ID format
        if (!packageId?.match(/^[a-zA-Z0-9\-]+$/)) {
            log.warn('Invalid package ID format', { packageId });
            throw new Error('Invalid package ID format');
        }

        // Validate metadata
        if (!metadata.Version || !metadata.ID || !metadata.Name) {
            log.warn('Missing required metadata fields', { metadata });
            throw new Error('Metadata must include Version, ID, and Name fields');
        }

        // Validate package ID matches metadata ID
        if (metadata.ID !== packageId) {
            log.warn('Package ID mismatch', { packageId, metadataId: metadata.ID });
            throw new Error('Package ID in metadata must match URL parameter');
        }

        // Get the package by name
        log.info('Fetching package by name', { name: metadata.Name });
        const existingPackage = await this.packageDynamoService.getPackageByName(metadata.Name);
        log.info('Fetched package', { existingPackage });
        
        // Check if package exists
        if (!existingPackage) {
            log.warn('Package not found', { name: metadata.Name });
            throw new Error('Package not found');
        }

        // Check authorization
        if (existingPackage.user_id !== userId) {
            log.warn('Unauthorized update attempt', { packageUserId: existingPackage.user_id, requestUserId: userId });
            throw new Error('Unauthorized to update this package');
        }

        // Validate package name matches
        if (existingPackage.name !== metadata.Name) {
            log.warn('Package name change attempted', { existing: existingPackage.name, new: metadata.Name });
            throw new Error('Package name cannot be changed during update');
        }

        // Compare versions
        log.info('Comparing versions', { new: metadata.Version, current: existingPackage.latest_version });
        if (!this.isNewerVersion(metadata.Version, existingPackage.latest_version)) {
            log.warn('Version downgrade attempted', { new: metadata.Version, current: existingPackage.latest_version });
            throw new Error('New version must be greater than current version');
        }

        // Upload the new package version
        let uploadResponse;
        try {
            if (data.URL) {
                log.info('Uploading package from URL', { url: data.URL });
                uploadResponse = await this.packageUploadService.uploadPackageFromUrl(data.URL, data.JSProgram, false, userId);
            } else if (data.Content) {
                log.info('Uploading package from Content');
                uploadResponse = await this.packageUploadService.uploadPackageFromZip(data.Content, data.JSProgram, false, userId);
            } else {
                log.warn('No URL or Content provided');
                throw new Error('Must provide either URL or Content');
            }

            if (!uploadResponse) {
                log.error('Upload failed - no response');
                throw new Error('Failed to update package: Upload failed');
            }

            // Update the package in DynamoDB
            log.info('Updating package metadata', { version: metadata.Version });
            await this.packageDynamoService.updatePackage({
                ...existingPackage,
                latest_version: metadata.Version
            });

            log.info('Package update successful', { packageId });
            return uploadResponse;
        } catch (error: unknown) {
            if (error instanceof Error) {
                log.error('Package update failed', { error: error.message, stack: error.stack });
                // Wrap upload errors in the expected format
                if (error.message === 'Upload failed') {
                    throw new Error('Failed to update package: Upload failed');
                }
                throw error;
            }
            log.error('Unknown error during package update');
            throw new Error('Failed to update package: Unknown error');
        }
    }

    private isNewerVersion(newVersion: string, currentVersion: string): boolean {
        const newParts = newVersion.split('.').map(Number);
        const currentParts = currentVersion.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (newParts[i] > currentParts[i]) return true;
            if (newParts[i] < currentParts[i]) return false;
        }
        return false;
    }
}

export const packageUpdateService = new PackageUpdateService();
