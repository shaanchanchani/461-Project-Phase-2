import { Response } from 'express';
import { ResetController } from '../../src/controllers/resetController';
import { AuthenticatedRequest } from '../../src/middleware/auth';
import { ResetService } from '../../src/services/resetService';

jest.mock('../../src/services/resetService');
jest.mock('../../src/logger');

describe('ResetController', () => {
    let resetController: ResetController;
    let mockResetService: jest.Mocked<ResetService>;
    let mockReq: Partial<AuthenticatedRequest>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockResetService = {
            resetRegistry: jest.fn()
        } as any;

        resetController = new ResetController(mockResetService);

        mockReq = {
            params: {},
            user: { name: 'testUser', isAdmin: false }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('resetRegistry', () => {
        it('should reset registry successfully', async () => {
            mockReq.user = { name: 'adminUser', isAdmin: true };
            mockResetService.resetRegistry.mockResolvedValue(undefined);

            await resetController.resetRegistry(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Registry reset successful' });
        });

        it('should return 401 if user not authenticated', async () => {
            mockReq.user = undefined;

            await resetController.resetRegistry(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not authenticated' });
        });

        it('should return 403 if user not admin', async () => {
            mockReq.user = { name: 'regularUser', isAdmin: false };

            await resetController.resetRegistry(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not authorized' });
        });

        it('should handle unexpected errors', async () => {
            mockReq.user = { name: 'adminUser', isAdmin: true };
            mockResetService.resetRegistry.mockRejectedValue(new Error('Unexpected error occurred'));

            await resetController.resetRegistry(mockReq as AuthenticatedRequest, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' });
        });
    });
});
