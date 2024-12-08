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
        metadata: { Version: string; ID: string },
        data: { URL?: string; Content?: string; JSProgram?: string },
        userId: string
    ) {
        // Validate package ID format
        if (!packageId?.match(/^[a-zA-Z0-9\-]+$/)) {
            throw new Error('Invalid package ID format');
        }

        // Validate metadata
        if (!metadata.Version || !metadata.ID) {
            throw new Error('Metadata must include Version and ID fields');
        }

        // Validate that metadata.ID matches package ID
        if (metadata.ID !== packageId) {
            throw new Error('Package ID in metadata must match URL parameter');
        }

        // Validate data (URL xor Content)
        if ((!data.URL && !data.Content) || (data.URL && data.Content)) {
            throw new Error('Must provide either URL or Content in data field, but not both');
        }

        // Check if package exists and user owns it
        const existingPackage = await this.packageDynamoService.getRawPackageById(packageId);
        if (!existingPackage) {
            throw new Error('Package not found');
        }

        if (existingPackage.user_id !== userId) {
            throw new Error('Unauthorized to update this package');
        }

        // Verify version is newer
        if (!this.isNewerVersion(metadata.Version, existingPackage.latest_version)) {
            throw new Error('New version must be greater than current version');
        }

        // Get the package by name since we need it for the upload service
        const packageByName = await this.packageDynamoService.getPackageByName(existingPackage.name);
        if (!packageByName) {
            throw new Error('Package not found by name');
        }

        // Check if this exact version already exists
        const existingVersion = await this.packageDynamoService.getPackageVersion(packageId, metadata.Version);
        if (existingVersion) {
            throw new Error(`Package version ${metadata.Version} already exists`);
        }

        try {
            // Upload the package using the upload service
            // The upload service will handle:
            // 1. Generating a new package ID
            // 2. Creating a new version entry
            // 3. Updating the package entry with the new package ID if this is a newer version
            const result = data.URL
                ? await this.packageUploadService.uploadPackageFromUrl(data.URL, data.JSProgram, false, userId)
                : await this.packageUploadService.uploadPackageFromZip(data.Content!, data.JSProgram, false, userId);

            return result;
        } catch (error: any) {
            log.error('Error updating package:', error);
            throw error;
        }
    }

    private isNewerVersion(newVersion: string, currentVersion: string): boolean {
        const [newMajor, newMinor, newPatch] = newVersion.split('.').map(Number);
        const [curMajor, curMinor, curPatch] = currentVersion.split('.').map(Number);

        if (newMajor > curMajor) return true;
        if (newMajor < curMajor) return false;
        if (newMinor > curMinor) return true;
        if (newMinor < curMinor) return false;
        return newPatch > curPatch;
    }
}

export const packageUpdateService = new PackageUpdateService();
