import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { log } from '../logger';

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

    /**
     * Clears all objects from the S3 bucket.
     * @returns Promise<void>
     * @throws Error if clearing fails
     */
    async clearBucket(): Promise<void> {
        try {
            console.log('Starting bucket clearing process...');
            
            let continuationToken: string | undefined;
            let deletedCount = 0;
    
            do {
                // List all objects in the bucket (no prefix to get everything)
                const listCommand = new ListObjectsV2Command({
                    Bucket: this.bucketName,
                    ContinuationToken: continuationToken
                });
    
                const listResponse = await this.s3Client.send(listCommand);
    
                if (listResponse.Contents && listResponse.Contents.length > 0) {
                    // Delete each object in the current batch
                    for (const object of listResponse.Contents) {
                        if (object.Key) {
                            const deleteCommand = new DeleteObjectCommand({
                                Bucket: this.bucketName,
                                Key: object.Key
                            });
    
                            await this.s3Client.send(deleteCommand);
                            deletedCount++;
                            console.log(`Deleted object: ${object.Key}`);
                        }
                    }
                }
    
                // Update the continuation token for the next batch
                continuationToken = listResponse.NextContinuationToken;
    
            } while (continuationToken);
    
            console.log(`Successfully deleted ${deletedCount} objects from bucket`);
    
            // Verify bucket is empty
            const isEmpty = await this.isBucketEmpty();
            if (!isEmpty) {
                throw new Error('Bucket still contains objects after deletion attempt');
            }
    
        } catch (error) {
            console.error('Error clearing bucket:', error);
            throw new Error(`Failed to clear bucket: ${(error as Error).message}`);
        }
    }

    /**
     * Checks if the S3 bucket is empty of package content
     * @returns Promise<boolean> - True if no package content exists, false otherwise
     */
    async isBucketEmpty(): Promise<boolean> {  // Fixed return type
        try {
            log.info('Checking if S3 bucket is empty...');
            
            const listCommand = new ListObjectsV2Command({
                Bucket: this.bucketName,
                Prefix: 'packages/',  // Only look for package content
                MaxKeys: 1  // We only need to know if at least one object exists
            });

            const response = await this.s3Client.send(listCommand);
            
            // If Contents is undefined or empty array, bucket is empty
            const isEmpty = !response.Contents || response.Contents.length === 0;
            
            log.info(`S3 bucket ${isEmpty ? 'is' : 'is not'} empty`);
            return isEmpty;

        } catch (error) {
            log.error('Error checking if S3 bucket is empty:', error);
            throw new Error(`Failed to check if bucket is empty: ${(error as Error).message}`);
        }
    }
    /**
     * Test function to check bucket status
     */
    async testBucketEmpty(): Promise<void> {
        try {
            log.info('Starting bucket empty test...');
            const isEmpty = await this.isBucketEmpty();
            log.info(`Test result: Bucket is ${isEmpty ? 'empty' : 'not empty'}`);
            
            if (!isEmpty) {
                // List the first few objects to see what's there
                const listCommand = new ListObjectsV2Command({
                    Bucket: this.bucketName,
                    Prefix: 'packages/',
                    MaxKeys: 5  // List up to 5 objects for inspection
                });

                const response = await this.s3Client.send(listCommand);
                
                if (response.Contents) {
                    log.info('Found objects:');
                    response.Contents.forEach(object => {
                        log.info(`- ${object.Key}`);
                    });
                }
            }
        } catch (error) {
            log.error('Test failed:', error);
            throw error;
        }
}

}
