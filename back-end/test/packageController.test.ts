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
    let mockPackageService: jest.Mocked<PackageService>;

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
            createPackage: jest.fn(),
            getPackage: jest.fn(),
            getPackageByName: jest.fn(),
            updatePackage: jest.fn(),
            resetRegistry: jest.fn(),
            processPackageFromUrl: jest.fn(),
            getGitHubVersion: jest.fn(),
            getNpmVersion: jest.fn()
        } as unknown as jest.Mocked<PackageService>;
        packageController = new PackageController(mockPackageService);
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

            const mockResponse = {
                metadata: {
                    ID: '123',
                    Name: 'test-package',
                    Version: '1.0.0'
                },
                data: mockPackageData.data
            };
            mockPackageService.createPackage.mockResolvedValue(mockResponse);

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockResponse);
        });

        it('should handle missing required fields', async () => {
            mockReq.body = { data: {} };
            
            mockPackageService.createPackage.mockRejectedValue(
                new Error('Must provide either Content or URL')
            );

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Must provide either Content or URL' });
        });

        it('should handle duplicate package uploads', async () => {
            mockReq.body = { URL: 'https://github.com/owner/repo' };
            mockPackageService.createPackage.mockRejectedValue(
                new Error('Package repo already exists in the registry')
            );

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(409);
            expect(mockRes.json).toHaveBeenCalledWith({ 
                error: 'Package repo already exists in the registry' 
            });
        });

        it('should validate GitHub URLs correctly', async () => {
            mockReq.body = { URL: 'invalid-url' };
            
            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ 
                error: 'Invalid URL format. Please use a valid GitHub (github.com/owner/repo) or npm (npmjs.com/package/name) URL' 
            });
        });

        it('should validate npm URLs correctly', async () => {
            mockReq.body = { URL: 'https://npmjs.com/package/invalid/format' };
            
            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ 
                error: 'Invalid URL format. Please use a valid GitHub (github.com/owner/repo) or npm (npmjs.com/package/name) URL' 
            });
        });

        it('should handle both URL and Content being provided', async () => {
            mockReq.body = { 
                URL: 'https://github.com/owner/repo',
                Content: 'base64content'
            };

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ 
                error: 'Cannot provide both Content and URL' 
            });
        });

        it('should handle package size limit exceeded', async () => {
            mockReq.body = { Content: 'large-base64-content' };
            mockPackageService.createPackage.mockRejectedValue(
                new Error('Package size exceeds limit')
            );

            await packageController.createPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ 
                error: 'Package size must be less than 50MB' 
            });
        });
    });

    describe('getPackage', () => {
        it('should get a package successfully', async () => {
            mockReq.params = { id: '123' };
            const mockPackage = {
                metadata: {
                    ID: '123',
                    Name: 'test-package',
                    Version: '1.0.0'
                },
                data: {
                    Content: 'test-content'
                }
            };
            
            mockPackageService.getPackage.mockResolvedValue(mockPackage);

            await packageController.getPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockPackage);
        });

        it('should handle package not found', async () => {
            mockReq.params = { id: 'non-existent' };
            
            mockPackageService.getPackage.mockRejectedValue(
                new Error('Package not found')
            );

            await packageController.getPackage(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Package not found' });
        });
    });

    describe('resetRegistry', () => {
        it('should handle not implemented error', async () => {
            mockPackageService.resetRegistry.mockRejectedValue(new Error('Not implemented'));

            await packageController.resetRegistry(
                mockReq as AuthenticatedRequest,
                mockRes as Response
            );

            expect(mockRes.status).toHaveBeenCalledWith(501);
            expect(mockRes.json).toHaveBeenCalledWith({ 
                error: 'Not implemented'
            });
        });
    });
});
