import { Response } from 'express';
import { DownloadController } from '../../src/controllers/downloadController';
import { AuthenticatedRequest } from '../../src/middleware/auth';
import { PackageDownloadService } from '../../src/services/packageDownloadService';
import { Package } from '../../src/types';

jest.mock('../../src/services/packageDownloadService');
jest.mock('../../src/logger');

describe('DownloadController', () => {
    let downloadController: DownloadController;
    let mockPackageDownloadService: jest.Mocked<PackageDownloadService>;
    let mockReq: Partial<AuthenticatedRequest>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockPackageDownloadService = {
            getPackageById: jest.fn()
        } as any;

        downloadController = new DownloadController(mockPackageDownloadService);

        mockReq = {
            params: {},
            user: { name: 'testUser', isAdmin: false }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('getPackageById', () => {
        const mockPackage: Package = {
            metadata: {
                Name: 'test-package',
                Version: '1.0.0',
                ID: '123'
            },
            data: {
                Content: 'base64-content'
            }
        };

        it('should get package successfully', async () => {
            mockReq.params = { id: '123' };
            mockPackageDownloadService.getPackageById.mockResolvedValue(mockPackage);

            await downloadController.getPackageById(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockPackage);
        });

        it('should return 401 if user not authenticated', async () => {
            mockReq.user = undefined;
            mockReq.params = { id: '123' };

            await downloadController.getPackageById(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
        });

        it('should return 400 if package ID format invalid', async () => {
            mockReq.params = { id: '123!@#' }; // Invalid format

            await downloadController.getPackageById(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid package ID format' });
        });

        it('should return 404 if package not found', async () => {
            mockReq.params = { id: '123' };
            mockPackageDownloadService.getPackageById.mockResolvedValue({} as Package);

            await downloadController.getPackageById(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Package not found' });
        });

        it('should return 404 if package content not found', async () => {
            mockReq.params = { id: '123' };
            mockPackageDownloadService.getPackageById.mockRejectedValue(new Error('Package content not found'));

            await downloadController.getPackageById(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Package content not found' });
        });
    });
});
