import { Request, Response } from 'express';
import { PackageController } from '../src/controllers/packageController';
import { PackageService } from '../src/services/packageService';
import { PackageUploadService } from '../src/services/packageUploadService';
import { AuthenticatedRequest } from '../src/middleware/auth';
import { PackageTableItem } from '../src/types';

jest.mock('../src/services/packageService');
jest.mock('../src/services/packageUploadService');
jest.mock('../src/logger');

describe('PackageController', () => {
    let mockReq: Partial<AuthenticatedRequest>;
    let mockRes: Partial<Response>;
    let packageController: PackageController;
    let mockPackageService: jest.Mocked<PackageService>;
    let mockPackageUploadService: jest.Mocked<PackageUploadService>;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockPackageService = {
            getPackageById: jest.fn(),
            getPackageByName: jest.fn(),
            listPackages: jest.fn(),
            resetRegistry: jest.fn(),
        } as unknown as jest.Mocked<PackageService>;

        mockPackageUploadService = {
            uploadPackageFromUrl: jest.fn(),
        } as unknown as jest.Mocked<PackageUploadService>;

        // Inject mock services
        packageController = new PackageController(mockPackageService);
        // @ts-ignore - Inject mock upload service
        packageController.packageUploadService = mockPackageUploadService;
    });

    describe('createPackage', () => {
        it('should create a package successfully', async () => {
            const mockPackageData = {
                URL: 'https://github.com/owner/repo',
                JSProgram: 'test-program',
                debloat: false
            };
            mockReq.body = mockPackageData;

            const mockResponse = {
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

            mockPackageUploadService.uploadPackageFromUrl.mockResolvedValue(mockResponse);

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockPackageUploadService.uploadPackageFromUrl).toHaveBeenCalledWith(
                mockPackageData.URL,
                mockPackageData.JSProgram,
                mockPackageData.debloat
            );
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockResponse);
        });

        it('should return 400 if URL is missing', async () => {
            mockReq.body = { JSProgram: 'test-program' };

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'URL is required' });
        });

        it('should handle errors from upload service', async () => {
            mockReq.body = { URL: 'https://github.com/owner/repo' };
            const error = new Error('Upload failed');
            mockPackageUploadService.uploadPackageFromUrl.mockRejectedValue(error);

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Upload failed' });
        });
    });

    describe('getPackage', () => {
        it('should get a package successfully', async () => {
            mockReq.params = { id: '123' };
            const packageData: PackageTableItem = {
                package_id: '123',
                name: 'test-package',
                latest_version: '1.0.0',
                description: 'Test package',
                created_at: new Date().toISOString(),
                user_id: 'test-user'
            };

            mockPackageService.getPackageById.mockResolvedValue(packageData);

            await packageController.getPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockPackageService.getPackageById).toHaveBeenCalledWith('123');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(packageData);
        });

        it('should return 404 if package not found', async () => {
            mockReq.params = { id: '123' };
            mockPackageService.getPackageById.mockResolvedValue(null);

            await packageController.getPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Package not found' });
        });

        it('should handle errors', async () => {
            mockReq.params = { id: '123' };
            mockPackageService.getPackageById.mockRejectedValue(new Error('Database error'));

            await packageController.getPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to retrieve package' });
        });
    });

    describe('getPackageByName', () => {
        it('should get a package by name successfully', async () => {
            mockReq.params = { name: 'test-package' };
            const packageData: PackageTableItem = {
                package_id: '123',
                name: 'test-package',
                latest_version: '1.0.0',
                description: 'Test package',
                created_at: new Date().toISOString(),
                user_id: 'test-user'
            };

            mockPackageService.getPackageByName.mockResolvedValue(packageData);

            await packageController.getPackageByName(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockPackageService.getPackageByName).toHaveBeenCalledWith('test-package');
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(packageData);
        });
    });
});
