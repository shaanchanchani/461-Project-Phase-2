import { S3Service } from './s3Service';
import { packageDynamoService, downloadDynamoService } from './dynamoServices';
import { log } from '../logger';
import { Package } from '../types';
import * as crypto from 'crypto';

export class PackageDownloadService {
    private s3Service: S3Service;
    private packageDb: any;
    private downloadDb: any;

    constructor() {
        this.s3Service = new S3Service();
        this.packageDb = packageDynamoService;
        this.downloadDb = downloadDynamoService;
    }

    /**
     * Get a package by its ID, including its content from S3
     * @param packageId The ID of the package
     * @param userName The name of the user downloading the package
     * @returns Package object with metadata and content
     */
    public async getPackageById(packageId: string, userName: string): Promise<Package> {
        try {
            // Validate package ID format
            if (!packageId.match(/^[a-zA-Z0-9\-]+$/)) {
                throw new Error('Invalid package ID format');
            }

            // Get package data from DynamoDB
            const packageData = await this.packageDb.getPackageById(packageId);
            if (!packageData) {
                throw new Error('Package not found');
            }

            if (!packageData.data || !packageData.data.Content) {
                throw new Error('Package content not found');
            }

            // Get content from S3 using the zip file path
            const content = await this.s3Service.getPackageContent(packageData.data.Content);
            if (!content) {
                throw new Error('Failed to retrieve package content from storage');
            }

            const base64Content = content.toString('base64');

            // Validate base64 content
            if (!base64Content || base64Content.trim() === '') {
                throw new Error('Invalid package content format');
            }

            // Record the download
            await this.downloadDb.recordDownload({
                download_id: crypto.randomUUID(),
                package_id: packageId,
                user_id: userName,
                version: packageData.metadata.Version,
                timestamp: new Date().toISOString()
            });

            // Return in the format specified by OpenAPI
            return {
                metadata: {
                    Name: packageData.metadata.Name,
                    Version: packageData.metadata.Version,
                    ID: packageData.metadata.ID
                },
                data: {
                    Content: base64Content
                }
            };
        } catch (error) {
            log.error('Error downloading package:', error);
            throw error;
        }
    }
}