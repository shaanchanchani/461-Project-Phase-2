import { Request, Response } from 'express';
import { PackageController } from '../src/controllers/packageController';
import { PackageService } from '../src/services/packageService';
import { AuthenticatedRequest } from '../src/middleware/auth';

jest.mock('../src/services/packageService');
jest.mock('../src/logger');

describe('PackageController', () => {
    let mockReq: Partial<AuthenticatedRequest>;
    let mockRes: Partial<Response>;
    let packageController: PackageController;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        packageController = new PackageController();
    });

    describe('createPackage', () => {
        it('should create a package successfully', async () => {
            const mockPackageData = {
                data: {
                    Content: 'test-content',
                    URL: 'test-url',
                    JSProgram: 'test-program'
                },
                metadata: { name: 'test-package' }
            };
            mockReq.body = mockPackageData;

            (PackageService.createPackage as jest.Mock).mockResolvedValue({ id: '123' });

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({ id: '123' });
        });

        it('should handle missing required fields', async () => {
            mockReq.body = { data: {} };
            
            (PackageService.createPackage as jest.Mock).mockRejectedValue(
                new Error('Must provide either Content or URL')
            );

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Must provide either Content or URL' });
        });
    });

    describe('getPackage', () => {
        it('should get a package successfully', async () => {
            mockReq.params = { id: '123' };
            const mockPackage = { id: '123', name: 'test-package' };
            
            (PackageService.getPackage as jest.Mock).mockResolvedValue(mockPackage);

            await packageController.getPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockPackage);
        });

        it('should handle package not found', async () => {
            mockReq.params = { id: 'non-existent' };
            
            (PackageService.getPackage as jest.Mock).mockRejectedValue(
                new Error('Package not found')
            );

            await packageController.getPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Package not found' });
        });
    });

    describe('resetRegistry', () => {
        it('should reset registry successfully', async () => {
            (PackageService.resetRegistry as jest.Mock).mockResolvedValue(undefined);

            await packageController.resetRegistry(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                jest.fn()
            );

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Registry reset successful' });
        });

        it('should handle reset registry failure', async () => {
            (PackageService.resetRegistry as jest.Mock).mockRejectedValue(new Error('Reset failed'));

            await packageController.resetRegistry(
                mockReq as AuthenticatedRequest,
                mockRes as Response,
                jest.fn()
            );

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to reset registry' });
        });
    });
});
