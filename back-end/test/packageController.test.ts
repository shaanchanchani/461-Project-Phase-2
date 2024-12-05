import { Request, Response } from 'express';
import { PackageController } from '../src/controllers/packageController';
import { AuthenticatedRequest } from '../src/middleware/auth';
import { Package } from '../src/types';

jest.mock('../src/services/packageDownloadService');
jest.mock('../src/services/packageUploadService');
jest.mock('../src/services/packageService');
jest.mock('../src/logger');

describe('PackageController', () => {
    let packageController: PackageController;
    let mockReq: Partial<AuthenticatedRequest>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        packageController = new PackageController();
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
        it('should create package from URL successfully', async () => {
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

            mockReq.body = {
                URL: 'https://github.com/test/repo',
                JSProgram: 'test-program'
            };

            // @ts-ignore - Mock upload service
            packageController.packageUploadService = {
                uploadPackageFromUrl: jest.fn().mockResolvedValue(mockPackage)
            };

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockPackage);
        });

        it('should create package from Content successfully', async () => {
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

            mockReq.body = {
                Content: 'base64-content',
                JSProgram: 'test-program'
            };

            // @ts-ignore - Mock upload service
            packageController.packageUploadService = {
                uploadPackageFromZip: jest.fn().mockResolvedValue(mockPackage)
            };

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockPackage);
        });

        it('should return 401 if user not authenticated', async () => {
            mockReq.user = undefined;
            mockReq.body = { URL: 'https://github.com/test/repo' };

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
        });

        it('should return 400 if neither URL nor Content provided', async () => {
            mockReq.body = { JSProgram: 'test-program' };

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Either URL or Content must be provided' });
        });

        it('should return 400 if both URL and Content provided', async () => {
            mockReq.body = {
                URL: 'https://github.com/test/repo',
                Content: 'base64-content'
            };

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Cannot provide both URL and Content' });
        });
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
            // @ts-ignore - Mock download service
            packageController.packageDownloadService = {
                getPackageById: jest.fn().mockResolvedValue(mockPackage)
            };

            await packageController.getPackageById(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockPackage);
        });

        it('should return 401 if user not authenticated', async () => {
            mockReq.user = undefined;
            mockReq.params = { id: '123' };

            await packageController.getPackageById(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
        });

        it('should return 400 if package ID format invalid', async () => {
            mockReq.params = { id: '123!@#' }; // Invalid format

            await packageController.getPackageById(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid package ID format' });
        });

        it('should return 404 if package not found', async () => {
            mockReq.params = { id: '123' };
            // @ts-ignore - Mock download service
            packageController.packageDownloadService = {
                getPackageById: jest.fn().mockResolvedValue(null)
            };

            await packageController.getPackageById(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Package not found' });
        });

        it('should return 404 if package content not found', async () => {
            mockReq.params = { id: '123' };
            // @ts-ignore - Mock download service
            packageController.packageDownloadService = {
                getPackageById: jest.fn().mockRejectedValue(new Error('Package content not found'))
            };

            await packageController.getPackageById(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Package content not found' });
        });
    });

    describe('resetRegistry', () => {
        let mockResetService: jest.Mocked<any>;

        beforeEach(() => {
            // Reset mocks before each test
            mockReq = {
                params: {},
                user: { name: 'testUser', isAdmin: false }
            };
            mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            
            // Create mock reset service
            mockResetService = {
                resetRegistry: jest.fn().mockResolvedValue(undefined)
            };

            // Create controller instance with mock service
            packageController = new PackageController(
                undefined,
                undefined,
                undefined,
                mockResetService
            );
        });

        it('should successfully reset registry when user is admin', async () => {
            mockReq.user = { name: 'adminUser', isAdmin: true };

            await packageController.resetRegistry(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockResetService.resetRegistry).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: "success",
                message: "Registry reset to default state"
            });
        });

        it('should return 401 when user is not authenticated', async () => {
            mockReq.user = undefined;

            await packageController.resetRegistry(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockResetService.resetRegistry).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: "Unauthorized",
                message: "Authentication required"
            });
        });

        it('should return 403 when user is not admin', async () => {
            mockReq.user = { name: 'regularUser', isAdmin: false };

            await packageController.resetRegistry(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockResetService.resetRegistry).not.toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: "Forbidden",
                message: "Only administrators can reset the registry"
            });
        });

        it('should handle S3 storage errors', async () => {
            mockReq.user = { name: 'adminUser', isAdmin: true };
            mockResetService.resetRegistry.mockRejectedValueOnce(new Error('S3 bucket clear failed'));

            await packageController.resetRegistry(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: "Storage Error",
                message: "Failed to clear package storage"
            });
        });

        it('should handle DynamoDB errors', async () => {
            mockReq.user = { name: 'adminUser', isAdmin: true };
            mockResetService.resetRegistry.mockRejectedValueOnce(new Error('DynamoDB tables reset failed'));

            await packageController.resetRegistry(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: "Database Error",
                message: "Failed to reset database state"
            });
        });

        it('should handle timeout errors', async () => {
            mockReq.user = { name: 'adminUser', isAdmin: true };
            mockResetService.resetRegistry.mockRejectedValueOnce(new Error('ETIMEDOUT: Operation timed out'));

            await packageController.resetRegistry(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(504);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: "Timeout Error",
                message: "Operation timed out while resetting registry"
            });
        });

        it('should handle admin configuration errors', async () => {
            mockReq.user = { name: 'adminUser', isAdmin: true };
            mockResetService.resetRegistry.mockRejectedValueOnce(new Error('Failed to restore admin user'));

            await packageController.resetRegistry(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: "Configuration Error",
                message: "Failed to restore default admin configuration"
            });
        });

        it('should handle unexpected errors', async () => {
            mockReq.user = { name: 'adminUser', isAdmin: true };
            mockResetService.resetRegistry.mockRejectedValueOnce(new Error('Unexpected error occurred'));

            await packageController.resetRegistry(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: "Internal Server Error",
                message: "An unexpected error occurred while resetting the registry"
            });
        });
    });
});
