import { TrackController } from '../src/controllers/trackController';
import { Request, Response } from 'express';
import { log } from '../src/logger';

jest.mock('../src/logger');

describe('TrackController', () => {
    let controller: TrackController;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
        controller = new TrackController();
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });
        mockResponse = {
            json: mockJson,
            status: mockStatus
        };
        mockRequest = {};
        jest.clearAllMocks();
    });

    describe('getTrack', () => {
        it('should return tracks successfully', async () => {
            await controller.getTrack(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith({
                tracks: ["None"]
            });
            expect(log.info).toHaveBeenCalledWith('GET /tracks endpoint hit');
            expect(log.info).toHaveBeenCalledWith('Successfully retrieved tracks: ["None"]');
        });

        it('should handle unexpected errors', async () => {
            // Mock JSON.stringify to throw an error
            const originalStringify = JSON.stringify;
            JSON.stringify = jest.fn().mockImplementation(() => {
                throw new Error('Stringify failed');
            });

            await controller.getTrack(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({
                error: "The system encountered an error while retrieving the student's track information."
            });
            expect(log.error).toHaveBeenCalledWith(
                'Error getting track information:',
                expect.any(Error)
            );

            // Restore original JSON.stringify
            JSON.stringify = originalStringify;
        });
    });
});
