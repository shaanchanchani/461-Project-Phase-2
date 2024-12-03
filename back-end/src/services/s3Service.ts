import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

export class S3Service {
    private s3Client: S3Client;
    private bucketName: string;

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

    async uploadPackageContent(packageId: string, zipContent: Buffer): Promise<string> {
        const key = `packages/${packageId}/content.zip`;
        
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: zipContent,
            ContentType: 'application/zip'
        });

        try {
            await this.s3Client.send(command);
            return key;
        } catch (error) {
            console.error('Error uploading to S3:', error);
            throw new Error('Failed to upload package content to S3');
        }
    }

    async getPackageContent(packageId: string): Promise<Buffer> {
        const key = `packages/${packageId}/content.zip`;
        
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key
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

    async getSignedDownloadUrl(packageId: string): Promise<string> {
        const key = `packages/${packageId}/content.zip`;
        
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key
        });

        try {
            return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
        } catch (error) {
            console.error('Error generating signed URL:', error);
            throw new Error('Failed to generate download URL');
        }
    }

    async deletePackageContent(packageId: string): Promise<void> {
        const key = `packages/${packageId}/content.zip`;
        
        const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key
        });

        try {
            await this.s3Client.send(command);
        } catch (error) {
            console.error('Error deleting from S3:', error);
            throw new Error('Failed to delete package content from S3');
        }
    }
}
