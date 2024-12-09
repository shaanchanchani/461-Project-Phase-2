import { ResetController } from '../src/controllers/resetController';
import { ResetService } from '../src/services/resetService';
import { Response } from 'express';
import { AuthenticatedRequest } from '../src/middleware/auth';
import { log } from '../src/logger';

jest.mock('../src/services/resetService');
jest.mock('../src/logger');

describe('ResetController', () => {
    let controller: ResetController;
    let mockResetService: jest.Mocked<ResetService>;
    let mockRequest: Partial<AuthenticatedRequest>;
    let mockResponse: Partial<Response>;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
        mockResetService = {
            resetRegistry: jest.fn()
        } as any;

        controller = new ResetController(mockResetService);

        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });
        mockResponse = {
            json: mockJson,
            status: mockStatus
        };

        mockRequest = {};

        jest.clearAllMocks();
    });

    describe('resetRegistry', () => {
        it('should successfully reset the registry', async () => {
            mockResetService.resetRegistry.mockResolvedValue(undefined);

            await controller.resetRegistry(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response
            );

            expect(mockResetService.resetRegistry).toHaveBeenCalled();
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                status: "success",
                message: "Registry reset to default state"
            });
            expect(log.info).toHaveBeenCalledWith('Starting registry reset process');
            expect(log.info).toHaveBeenCalledWith('Registry reset completed successfully');
        });

        it('should handle S3 storage errors', async () => {
            mockResetService.resetRegistry.mockRejectedValue(
                new Error('S3 bucket deletion failed')
            );

            await controller.resetRegistry(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                error: "Storage Error",
                message: "Failed to clear package storage"
            });
            expect(log.error).toHaveBeenCalledWith(
                'Error in resetRegistry:',
                expect.any(Error)
            );
        });

        it('should handle DynamoDB database errors', async () => {
            mockResetService.resetRegistry.mockRejectedValue(
                new Error('DynamoDB table deletion failed')
            );

            await controller.resetRegistry(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                error: "Database Error",
                message: "Failed to reset database state"
            });
            expect(log.error).toHaveBeenCalledWith(
                'Error in resetRegistry:',
                expect.any(Error)
            );
        });

        it('should handle timeout errors', async () => {
            mockResetService.resetRegistry.mockRejectedValue(
                new Error('timeout occurred during reset')
            );

            await controller.resetRegistry(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(504);
            expect(mockJson).toHaveBeenCalledWith({
                error: "Timeout Error",
                message: "Operation timed out while resetting registry"
            });
            expect(log.error).toHaveBeenCalledWith(
                'Error in resetRegistry:',
                expect.any(Error)
            );
        });

        it('should handle generic errors', async () => {
            mockResetService.resetRegistry.mockRejectedValue(
                new Error('Unknown error occurred')
            );

            await controller.resetRegistry(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                error: "Internal Server Error",
                message: "An unexpected error occurred while resetting the registry"
            });
            expect(log.error).toHaveBeenCalledWith(
                'Error in resetRegistry:',
                expect.any(Error)
            );
        });

        it('should handle non-Error objects', async () => {
            mockResetService.resetRegistry.mockRejectedValue('string error');

            await controller.resetRegistry(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                error: "Internal Server Error",
                message: "An unexpected error occurred while resetting the registry"
            });
            expect(log.error).toHaveBeenCalledWith(
                'Error in resetRegistry:',
                'string error'
            );
        });
    });
});
