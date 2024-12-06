import { CostController } from '../src/controllers/costController';
import { Response } from 'express';
import { AuthenticatedRequest } from '../src/middleware/auth';
import { costService } from '../src/services/costService';

// Mock the cost service
jest.mock('../src/services/costService', () => ({
    costService: {
        calculatePackageCost: jest.fn()
    }
}));

describe('CostController', () => {
    let controller: CostController;
    let mockRequest: Partial<AuthenticatedRequest>;
    let mockResponse: Partial<Response>;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock response functions
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });

        // Setup mock request and response
        mockRequest = {
            params: { id: 'test-package-123' },
            query: {}
        };

        mockResponse = {
            status: mockStatus,
            json: mockJson
        };

        controller = new CostController();
    });

    describe('getPackageCost', () => {
        it('should return package cost successfully', async () => {
            const mockCost = {
                'test-package-123': {
                    standaloneCost: 50.0,
                    totalCost: 50.0
                }
            };

            (costService.calculatePackageCost as jest.Mock).mockResolvedValueOnce(mockCost);

            await controller.getPackageCost(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(mockCost);
        });

        it('should handle missing package ID', async () => {
            mockRequest.params = {};

            await controller.getPackageCost(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({ error: 'Package ID is required' });
        });

        it('should handle package not found', async () => {
            (costService.calculatePackageCost as jest.Mock).mockRejectedValueOnce(new Error('Package not found'));

            await controller.getPackageCost(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(404);
            expect(mockJson).toHaveBeenCalledWith({ error: 'Package not found' });
        });

        it('should handle calculation errors', async () => {
            (costService.calculatePackageCost as jest.Mock).mockRejectedValueOnce(new Error('Calculation failed'));

            await controller.getPackageCost(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to calculate package cost' });
        });

        it('should consider includeDependencies query parameter', async () => {
            mockRequest.query = { includeDependencies: 'true' };
            const mockCost = {
                'test-package-123': {
                    standaloneCost: 50.0,
                    totalCost: 75.0
                }
            };

            (costService.calculatePackageCost as jest.Mock).mockResolvedValueOnce(mockCost);

            await controller.getPackageCost(
                mockRequest as AuthenticatedRequest,
                mockResponse as Response
            );

            expect(costService.calculatePackageCost).toHaveBeenCalledWith('test-package-123', true);
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(mockCost);
        });
    });
});
