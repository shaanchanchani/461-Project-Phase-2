import { S3Service } from './s3Service';
import { DynamoDBService, dynamoDBService } from './dynamoDBService';
import { log } from '../logger';
import { Package, PackageTableItem, PackageVersionTableItem } from '../types';
import * as crypto from 'crypto';

export class PackageDownloadService {
    private s3Service: S3Service;
    private db: DynamoDBService;

    constructor() {
        this.s3Service = new S3Service();
        this.db = dynamoDBService;
    }

    /**
     * Get a package by its name, including its content from S3
     * @param packageName The name of the package
     * @param userName The name of the user downloading the package
     * @returns Package object with metadata and content
     */
    public async getPackageByName(packageName: string, userName: string): Promise<Package> {
        try {
            // Get package metadata from DynamoDB
            const packageData = await this.db.getPackageByName(packageName);
            if (!packageData) {
                throw new Error('Package not found');
            }

            // Get latest version data
            const versionData = await this.db.getLatestPackageVersion(packageData.package_id);
            if (!versionData) {
                throw new Error('Package version not found');
            }

            // Get content from S3 using the zip file path
            const content = await this.s3Service.getPackageContent(versionData.zip_file_path);
            const base64Content = content.toString('base64');

            // Record the download
            await this.db.recordDownload({
                download_id: crypto.randomUUID(),
                package_id: packageData.package_id,
                user_id: userName,
                version: versionData.version,
                timestamp: new Date().toISOString()
            });

            // Return in the format specified by OpenAPI
            return {
                metadata: {
                    Name: packageData.name,
                    Version: versionData.version,
                    ID: packageData.package_id
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

    /**
     * Get a specific version of a package by name
     * @param packageName The name of the package
     * @param version The specific version to retrieve
     * @param userName The name of the user downloading the package
     * @returns Package object with metadata and content
     */
    public async getPackageVersion(packageName: string, version: string, userName: string): Promise<Package> {
        try {
            // Get package metadata
            const packageData = await this.db.getPackageByName(packageName);
            if (!packageData) {
                throw new Error('Package not found');
            }

            // Get specific version data
            const versionData = await this.db.getPackageVersion(packageData.package_id, version);
            if (!versionData) {
                throw new Error('Package version not found');
            }

            // Get content from S3 using the zip file path
            const content = await this.s3Service.getPackageContent(versionData.zip_file_path);
            const base64Content = content.toString('base64');

            // Record the download
            await this.db.recordDownload({
                download_id: crypto.randomUUID(),
                package_id: packageData.package_id,
                user_id: userName,
                version: version,
                timestamp: new Date().toISOString()
            });

            // Return in the format specified by OpenAPI
            return {
                metadata: {
                    Name: packageData.name,
                    Version: version,
                    ID: packageData.package_id
                },
                data: {
                    Content: base64Content
                }
            };
        } catch (error) {
            log.error('Error downloading package version:', error);
            throw error;
        }
    }
}