import { Request, Response } from 'express';
import { RatingController } from '../src/controllers/ratingController';
import { RatingService } from '../src/services/ratingService';

jest.mock('../src/services/ratingService');
jest.mock('../src/logger');

describe('RatingController', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockReq = {
            params: {},
            query: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('getRating', () => {
        it('should get rating successfully', async () => {
            mockReq.params = { id: '123' };
            const mockRating = { score: 0.8 };
            
            (RatingService.calculateRating as jest.Mock).mockResolvedValue(mockRating);

            await RatingController.getRating(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockRating);
        });

        it('should handle rating calculation error', async () => {
            mockReq.params = { id: '123' };
            
            (RatingService.calculateRating as jest.Mock).mockRejectedValue(new Error('Calculation failed'));

            await RatingController.getRating(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to calculate rating' });
        });
    });

    describe('getCost', () => {
        it('should get cost successfully with dependency true', async () => {
            mockReq.params = { id: '123' };
            mockReq.query = { dependency: 'true' };
            const mockCost = { value: 0.5 };
            
            (RatingService.calculateCost as jest.Mock).mockResolvedValue(mockCost);

            await RatingController.getCost(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockCost);
            expect(RatingService.calculateCost).toHaveBeenCalledWith('123', true);
        });

        it('should get cost successfully with dependency false', async () => {
            mockReq.params = { id: '123' };
            mockReq.query = { dependency: 'false' };
            const mockCost = { value: 0.3 };
            
            (RatingService.calculateCost as jest.Mock).mockResolvedValue(mockCost);

            await RatingController.getCost(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockCost);
            expect(RatingService.calculateCost).toHaveBeenCalledWith('123', false);
        });

        it('should handle cost calculation error', async () => {
            mockReq.params = { id: '123' };
            mockReq.query = { dependency: 'true' };
            
            (RatingService.calculateCost as jest.Mock).mockRejectedValue(new Error('Calculation failed'));

            await RatingController.getCost(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to calculate cost' });
        });
    });
});
