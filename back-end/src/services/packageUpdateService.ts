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
        // Validate package ID format
        if (!packageId?.match(/^[a-zA-Z0-9\-]+$/)) {
            throw new Error('Invalid package ID format');
        }

        // Validate metadata
        if (!metadata.Version || !metadata.ID || !metadata.Name) {
            throw new Error('Metadata must include Version, ID, and Name fields');
        }

        // Get the latest version of the package
        const latestPackage = await this.packageDynamoService.getLatestPackageByName(metadata.Name);
        
        // Check if package exists
        if (!latestPackage) {
            throw new Error('Package not found');
        }

        // Check authorization
        if (latestPackage.user_id !== userId) {
            throw new Error('Unauthorized to update this package');
        }

        // Validate package name matches
        if (latestPackage.name !== metadata.Name) {
            throw new Error('Package name cannot be changed during update');
        }

        // Verify version is newer than the latest version
        if (!this.isNewerVersion(metadata.Version, latestPackage.latest_version)) {
            throw new Error('New version must be greater than current version');
        }

        // Validate data (URL xor Content)
        if ((!data.URL && !data.Content) || (data.URL && data.Content)) {
            throw new Error('Must provide either URL or Content in data field, but not both');
        }

        // Upload the package using the upload service
        let uploadResponse;
        try {
            uploadResponse = data.URL
                ? await this.packageUploadService.uploadPackageFromUrl(data.URL, data.JSProgram, false, userId)
                : await this.packageUploadService.uploadPackageFromZip(data.Content!, data.JSProgram, false, userId);
        } catch (error) {
            log.error('Failed to upload updated package:', error);
            throw new Error('Failed to update package: Upload failed');
        }

        // Update package metadata in DynamoDB
        try {
            await this.packageDynamoService.updatePackage({
                package_id: latestPackage.package_id, // Use the latest package ID
                latest_version: metadata.Version,
                name: metadata.Name,
                description: latestPackage.description,
                user_id: userId,
                created_at: latestPackage.created_at
            });

            return uploadResponse;
        } catch (error) {
            log.error('Failed to update package metadata:', error);
            throw new Error('Failed to update package metadata in database');
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
