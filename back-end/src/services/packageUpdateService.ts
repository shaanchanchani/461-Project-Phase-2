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

        // Validate package ID matches metadata ID
        if (metadata.ID !== packageId) {
            throw new Error('Package ID in metadata must match URL parameter');
        }

        // Get the package by name
        const existingPackage = await this.packageDynamoService.getPackageByName(metadata.Name);
        
        // Check if package exists
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

        // Upload the new package version
        let uploadResponse;
        try {
            if (data.URL) {
                uploadResponse = await this.packageUploadService.uploadPackageFromUrl(data.URL, data.JSProgram, false, userId);
            } else if (data.Content) {
                uploadResponse = await this.packageUploadService.uploadPackageFromZip(data.Content, data.JSProgram, false, userId);
            } else {
                throw new Error('Must provide either URL or Content');
            }

            if (!uploadResponse) {
                throw new Error('Failed to update package: Upload failed');
            }

            // Update the package in DynamoDB
            await this.packageDynamoService.updatePackage({
                ...existingPackage,
                latest_version: metadata.Version
            });

            return uploadResponse;
        } catch (error: unknown) {
            if (error instanceof Error) {
                // Wrap upload errors in the expected format
                if (error.message === 'Upload failed') {
                    throw new Error('Failed to update package: Upload failed');
                }
                throw error;
            }
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
