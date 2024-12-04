import { S3Service } from './s3Service';
import { DynamoDBService, dynamoDBService } from './dynamoDBService';
import { log } from '../logger';
import { Package } from '../types';
import * as crypto from 'crypto';

export class PackageDownloadService {
    private s3Service: S3Service;
    private db: DynamoDBService;

    constructor() {
        this.s3Service = new S3Service();
        this.db = dynamoDBService;
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
            const packageData = await this.db.getPackageById(packageId);
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
            await this.db.recordDownload({
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