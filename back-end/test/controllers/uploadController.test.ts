import { Response } from 'express';
import { UploadController } from '../../src/controllers/uploadController';
import { AuthenticatedRequest } from '../../src/middleware/auth';
import { PackageUploadService } from '../../src/services/packageUploadService';

jest.mock('../../src/services/packageUploadService');
jest.mock('../../src/logger');

describe('UploadController', () => {
    let uploadController: UploadController;
    let mockPackageUploadService: jest.Mocked<PackageUploadService>;
    let mockReq: Partial<AuthenticatedRequest>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockPackageUploadService = {
            uploadPackageFromUrl: jest.fn(),
            uploadPackageFromZip: jest.fn()
        } as any;

        uploadController = new UploadController(mockPackageUploadService);

        mockReq = {
            params: {},
            user: { name: 'testUser', isAdmin: false }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('createPackage', () => {
        const mockPackage = {
            metadata: {
                Name: 'test-package',
                Version: '1.0.0',
                ID: '123'
            },
            data: {
                Content: 'base64-content',
                JSProgram: 'test-program'
            }
        };

        it('should create package from URL successfully', async () => {
            mockReq.body = {
                URL: 'https://github.com/test/repo',
                JSProgram: 'test-program'
            };

            mockPackageUploadService.uploadPackageFromUrl.mockResolvedValue(mockPackage);

            await uploadController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockPackage);
        });

        it('should create package from Content successfully', async () => {
            mockReq.body = {
                Content: 'base64-content',
                JSProgram: 'test-program'
            };

            mockPackageUploadService.uploadPackageFromZip.mockResolvedValue(mockPackage);

            await uploadController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockPackage);
        });

        it('should return 401 if user not authenticated', async () => {
            mockReq.user = undefined;
            mockReq.body = { URL: 'https://github.com/test/repo' };

            await uploadController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
        });

        it('should return 400 if neither URL nor Content provided', async () => {
            mockReq.body = { JSProgram: 'test-program' };

            await uploadController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Either URL or Content must be provided' });
        });

        it('should return 400 if both URL and Content provided', async () => {
            mockReq.body = {
                URL: 'https://github.com/test/repo',
                Content: 'base64-content'
            };

            await uploadController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Cannot provide both URL and Content' });
        });
    });
});
