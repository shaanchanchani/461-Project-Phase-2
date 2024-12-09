import { UpdateController } from '../src/controllers/updateController';
import { packageUpdateService } from '../src/services/packageUpdateService';
import { Request, Response } from 'express';
import { log } from '../src/logger';

jest.mock('../src/services/packageUpdateService');
jest.mock('../src/logger');

describe('UpdateController', () => {
    let controller: UpdateController;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
        controller = new UpdateController();
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });
        mockResponse = {
            json: mockJson,
            status: mockStatus
        };
        jest.clearAllMocks();
    });

    describe('updatePackage', () => {
        const validMetadata = {
            Name: 'test-package',
            Version: '1.0.0',
            ID: 'test-id'
        };

        const validUrlData = {
            URL: 'https://github.com/test/repo'
        };

        const validContentData = {
            Content: 'base64-encoded-content'
        };

        it('should return 400 if request body is missing metadata or data', async () => {
            mockRequest = {
                params: { id: 'test-id' },
                body: {}
            };

            await controller.updatePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Request body must include metadata and data fields'
            });
        });

        it('should return 400 if metadata is missing required fields', async () => {
            mockRequest = {
                params: { id: 'test-id' },
                body: {
                    metadata: { Name: 'test' },
                    data: validUrlData
                }
            };

            await controller.updatePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Metadata must include Name, Version, and ID fields'
            });
        });

        it('should return 400 if data is missing both URL and Content', async () => {
            mockRequest = {
                params: { id: 'test-id' },
                body: {
                    metadata: validMetadata,
                    data: {}
                }
            };

            await controller.updatePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Data must include either URL or Content field'
            });
        });

        it('should return 400 if data includes both URL and Content', async () => {
            mockRequest = {
                params: { id: 'test-id' },
                body: {
                    metadata: validMetadata,
                    data: {
                        URL: 'https://github.com/test/repo',
                        Content: 'base64-content'
                    }
                }
            };

            await controller.updatePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Cannot provide both URL and Content fields'
            });
        });

        it('should return 400 if package ID in URL does not match metadata', async () => {
            mockRequest = {
                params: { id: 'different-id' },
                body: {
                    metadata: validMetadata,
                    data: validUrlData
                }
            };

            await controller.updatePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Package ID in URL must match ID in metadata'
            });
        });

        it('should successfully update package with URL', async () => {
            const mockResult = { success: true };
            (packageUpdateService.updatePackage as jest.Mock).mockResolvedValue(mockResult);

            mockRequest = {
                params: { id: 'test-id' },
                body: {
                    metadata: validMetadata,
                    data: validUrlData
                }
            };

            await controller.updatePackage(mockRequest as Request, mockResponse as Response);

            expect(packageUpdateService.updatePackage).toHaveBeenCalledWith(
                'test-id',
                validMetadata,
                validUrlData,
                'admin'
            );
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(mockResult);
        });

        it('should successfully update package with Content', async () => {
            const mockResult = { success: true };
            (packageUpdateService.updatePackage as jest.Mock).mockResolvedValue(mockResult);

            mockRequest = {
                params: { id: 'test-id' },
                body: {
                    metadata: validMetadata,
                    data: validContentData
                }
            };

            await controller.updatePackage(mockRequest as Request, mockResponse as Response);

            expect(packageUpdateService.updatePackage).toHaveBeenCalledWith(
                'test-id',
                validMetadata,
                validContentData,
                'admin'
            );
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(mockResult);
        });

        it('should return 424 if package fails quality requirements', async () => {
            (packageUpdateService.updatePackage as jest.Mock)
                .mockRejectedValue(new Error('Package failed quality requirements'));

            mockRequest = {
                params: { id: 'test-id' },
                body: {
                    metadata: validMetadata,
                    data: validUrlData
                }
            };

            await controller.updatePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(424);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Package failed quality requirements'
            });
            expect(log.error).toHaveBeenCalled();
        });

        it('should return 400 for validation errors', async () => {
            (packageUpdateService.updatePackage as jest.Mock)
                .mockRejectedValue(new Error('Invalid package format'));

            mockRequest = {
                params: { id: 'test-id' },
                body: {
                    metadata: validMetadata,
                    data: validUrlData
                }
            };

            await controller.updatePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Invalid package format'
            });
            expect(log.error).toHaveBeenCalled();
        });

        it('should return 404 if package is not found', async () => {
            (packageUpdateService.updatePackage as jest.Mock)
                .mockRejectedValue(new Error('Package not found'));

            mockRequest = {
                params: { id: 'test-id' },
                body: {
                    metadata: validMetadata,
                    data: validUrlData
                }
            };

            await controller.updatePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(404);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Package not found'
            });
            expect(log.error).toHaveBeenCalled();
        });

        it('should return 401 for unauthorized access', async () => {
            (packageUpdateService.updatePackage as jest.Mock)
                .mockRejectedValue(new Error('Unauthorized access'));

            mockRequest = {
                params: { id: 'test-id' },
                body: {
                    metadata: validMetadata,
                    data: validUrlData
                }
            };

            await controller.updatePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(401);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Unauthorized access'
            });
            expect(log.error).toHaveBeenCalled();
        });

        it('should return 500 for unknown errors', async () => {
            (packageUpdateService.updatePackage as jest.Mock)
                .mockRejectedValue(new Error('Unknown error'));

            mockRequest = {
                params: { id: 'test-id' },
                body: {
                    metadata: validMetadata,
                    data: validUrlData
                }
            };

            await controller.updatePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Internal server error'
            });
            expect(log.error).toHaveBeenCalled();
        });
    });
});
