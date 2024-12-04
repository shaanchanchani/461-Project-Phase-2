import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

/**
 * S3Service handles all interactions with AWS S3 for package content storage.
 * 
 * Required Environment Variables:
 * - AWS_ACCESS_KEY_ID: Your AWS access key
 * - AWS_SECRET_ACCESS_KEY: Your AWS secret key
 * - S3_REGION: AWS region for S3 (e.g., 'us-east-1')
 * - S3_BUCKET_NAME: 461-team6-bucket-test
 * 
 * File Structure:
 * All files are stored in the format: packages/{packageId}/content.zip
 */
export class S3Service {
    private s3Client: S3Client;
    private bucketName: string;

    /**
     * Initializes the S3 service with credentials from environment variables.
     * @throws Error if required environment variables are not set
     */
    constructor() {
        if (!process.env.AWS_ACCESS_KEY_ID) {
            throw new Error('AWS_ACCESS_KEY_ID is not set in environment variables');
        }
        if (!process.env.AWS_SECRET_ACCESS_KEY) {
            throw new Error('AWS_SECRET_ACCESS_KEY is not set in environment variables');
        }
        if (!process.env.S3_BUCKET_NAME) {
            throw new Error('S3_BUCKET_NAME is not set in environment variables');
        }
        if (!process.env.S3_REGION) {
            throw new Error('S3_REGION is not set in environment variables');
        }

        this.s3Client = new S3Client({
            region: process.env.S3_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
        this.bucketName = process.env.S3_BUCKET_NAME;
    }

    /**
     * Uploads a zip file to S3 for a specific package.
     * @param filePath - Full path to store the file in S3
     * @param zipContent - Buffer containing the zip file content
     * @returns Promise<string> - The S3 key where the file was stored
     * @throws Error if upload fails
     * 
     * Example:
     * ```typescript
     * const zipBuffer = Buffer.from(...); // your zip content
     * const key = await s3Service.uploadPackageContent('packages/package-123/content.zip', zipBuffer);
     * ```
     */
    async uploadPackageContent(filePath: string, zipContent: Buffer): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: filePath,
            Body: zipContent,
            ContentType: 'application/zip'
        });

        try {
            await this.s3Client.send(command);
            return filePath;
        } catch (error) {
            console.error('Error uploading to S3:', error);
            throw new Error('Failed to upload package content to S3');
        }
    }

    /**
     * Downloads a package's zip file content from S3.
     * @param filePath - Full path to the file in S3
     * @returns Promise<Buffer> - The zip file content as a buffer
     * @throws Error if the file doesn't exist or download fails
     * 
     * Example:
     * ```typescript
     * const content = await s3Service.getPackageContent('packages/package-123/content.zip');
     * // Use content buffer...
     * ```
     */
    async getPackageContent(filePath: string): Promise<Buffer> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: filePath
        });

        try {
            const response = await this.s3Client.send(command);
            if (!response.Body) {
                throw new Error('No content found');
            }
            
            // Convert the readable stream to a buffer
            const stream = response.Body as Readable;
            const chunks: Buffer[] = [];
            
            return new Promise((resolve, reject) => {
                stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
                stream.on('error', (err) => reject(err));
                stream.on('end', () => resolve(Buffer.concat(chunks)));
            });
        } catch (error) {
            console.error('Error downloading from S3:', error);
            throw new Error('Failed to download package content from S3');
        }
    }

    /**
     * Generates a temporary signed URL for downloading a package's zip file.
     * The URL expires in 1 hour.
     * @param filePath - Full path to the file in S3
     * @returns Promise<string> - Temporary signed URL for downloading the file
     * @throws Error if URL generation fails
     * 
     * Example:
     * ```typescript
     * const url = await s3Service.getSignedDownloadUrl('packages/package-123/content.zip');
     * // Share URL with client...
     * ```
     */
    async getSignedDownloadUrl(filePath: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: filePath
        });

        try {
            return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
        } catch (error) {
            console.error('Error generating signed URL:', error);
            throw new Error('Failed to generate download URL');
        }
    }

    /**
     * Deletes a package's zip file from S3.
     * @param filePath - Full path to the file in S3
     * @returns Promise<void>
     * @throws Error if deletion fails
     * 
     * Example:
     * ```typescript
     * await s3Service.deletePackageContent('packages/package-123/content.zip');
     * ```
     */
    async deletePackageContent(filePath: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: filePath
        });

        try {
            await this.s3Client.send(command);
        } catch (error) {
            console.error('Error deleting from S3:', error);
            throw new Error('Failed to delete package content from S3');
        }
    }
}
