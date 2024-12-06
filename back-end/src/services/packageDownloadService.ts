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
            // Get package data from DynamoDB
            const packageData = await this.packageDb.getPackageById(packageId);
            if (!packageData) {
                throw new Error('Package not found');
            }

            if (!packageData.data.Content) {
                throw new Error('Package content not found');
            }

            // Get content from S3 using the zip file path
            const content = await this.s3Service.getPackageContent(packageData.data.Content);
            const base64Content = content.toString('base64');

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
                metadata: packageData.metadata,
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