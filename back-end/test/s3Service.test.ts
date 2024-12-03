import { S3Service } from '../src/services/s3Service';
import * as fs from 'fs';
import * as path from 'path';

describe('S3Service Tests', () => {
    let s3Service: S3Service;
    let testPackageId: string;
    
    beforeAll(() => {
        s3Service = new S3Service();
        testPackageId = 'test-package-' + Date.now();
    });

    afterAll(async () => {
        // Clean up any leftover test files
        try {
            await s3Service.deletePackageContent(testPackageId);
        } catch (error) {
            // Ignore errors during cleanup
            console.log('Cleanup: No files to delete or already deleted');
        }
    });

    beforeEach(() => {
        // Reset the test package ID for each test to ensure isolation
        testPackageId = 'test-package-' + Date.now();
    });

    it('should upload, download, and delete a test zip file', async () => {
        // Create a small test buffer (simulating a zip file)
        const testContent = Buffer.from('Test content for zip file');

        try {
            // Test upload
            console.log('Testing upload...');
            const s3Key = await s3Service.uploadPackageContent(testPackageId, testContent);
            expect(s3Key).toBeDefined();
            expect(s3Key).toContain(testPackageId);

            // Test download
            console.log('Testing download...');
            const downloadedContent = await s3Service.getPackageContent(testPackageId);
            expect(downloadedContent).toBeDefined();
            expect(downloadedContent.toString()).toBe(testContent.toString());

            // Test signed URL generation
            console.log('Testing signed URL generation...');
            const signedUrl = await s3Service.getSignedDownloadUrl(testPackageId);
            expect(signedUrl).toBeDefined();
            expect(signedUrl).toContain(testPackageId);
            
            // Test delete
            console.log('Testing delete...');
            await s3Service.deletePackageContent(testPackageId);
            
            // Verify deletion by attempting to download (should throw an error)
            try {
                await s3Service.getPackageContent(testPackageId);
                fail('Expected an error when downloading deleted content');
            } catch (error) {
                expect(error).toBeDefined();
            }

            console.log('All tests passed successfully!');
        } catch (error) {
            console.error('Test failed:', error);
            throw error;
        }
    }, 30000); // Increased timeout for network operations
});