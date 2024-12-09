import { RatingService } from '../src/services/ratingService';
import { PackageRating, PackageMetricsTableItem } from '../src/types';
import { MetricService } from '../src/services/metricService';
import { RatingController } from '../src/controllers/ratingController';
import { Request, Response } from 'express';

class MockMetricService extends MetricService {
    private mockMetrics: PackageMetricsTableItem | null = null;
    private mockVersion: { version_id: string } | null = { version_id: 'test-version' };

    constructor() {
        const mockDb = {
            getLatestPackageVersion: async () => null,
            getMetricsByVersionId: async () => null,
            createMetricEntry: async () => null
        };
        super(mockDb, mockDb);
        
        this.getMetricsByVersionId = jest.fn().mockImplementation(async () => this.mockMetrics);
        
        this.packageDb = {
            ...mockDb,
            getLatestPackageVersion: async () => this.mockVersion
        };
    }

    public setMockMetrics(metrics: PackageMetricsTableItem | null) {
        this.mockMetrics = metrics;
    }

    public setMockVersion(version: { version_id: string } | null) {
        this.mockVersion = version;
    }
}

describe('Rating Service Tests', () => {
    let ratingService: RatingService;
    let mockMetricService: MockMetricService;

    beforeEach(() => {
        mockMetricService = new MockMetricService();
        ratingService = new RatingService(mockMetricService);
    });

    describe('calculateRating', () => {
        it('should throw error for invalid package ID', async () => {
            await expect(ratingService.calculateRating('')).rejects.toThrow('Invalid package ID format');
            await expect(ratingService.calculateRating('invalid@id')).rejects.toThrow('Invalid package ID format');
        });

        it('should return default ratings for missing metrics', async () => {
            mockMetricService.setMockMetrics(null);
            const result = await ratingService.calculateRating('valid-id');
            expect(result).toEqual({
                BusFactor: -1,
                BusFactorLatency: -1,
                Correctness: -1,
                CorrectnessLatency: -1,
                GoodPinningPractice: -1,
                GoodPinningPracticeLatency: -1,
                LicenseScore: -1,
                LicenseScoreLatency: -1,
                NetScore: -1,
                NetScoreLatency: -1,
                PullRequest: -1,
                PullRequestLatency: -1,
                RampUp: -1,
                RampUpLatency: -1,
                ResponsiveMaintainer: -1,
                ResponsiveMaintainerLatency: -1
            });
        });

        it('should return -1 for NetScore when any metric is missing', async () => {
            mockMetricService.setMockMetrics({
                version_id: 'test-version',
                bus_factor: 0.8,
                correctness: 0.9,
                ramp_up: 0.7,
                responsive_maintainer: 0.6,
                // license_score is missing
                good_pinning_practice: 0.8,
                pull_request: 0.7,
                metric_id: 'test-metric-id',
                bus_factor_latency: 0,
                ramp_up_latency: 0,
                responsive_maintainer_latency: 0,
                license_score_latency: 0,
                good_pinning_practice_latency: 0,
                pull_request_latency: 0,
                correctness_latency: 0,
                net_score: 0.785,
                net_score_latency: 0
            } as any);

            const result = await ratingService.calculateRating('valid-id');
            expect(result.NetScore).toBe(-1);
        });

        it('should calculate net score correctly when all required metrics are available', async () => {
            mockMetricService.setMockMetrics({
                version_id: 'test-version',
                bus_factor: 0.8,
                correctness: 0.9,
                ramp_up: 0.7,
                responsive_maintainer: 0.6,
                license_score: 1.0,
                good_pinning_practice: 0.8,
                pull_request: 0.7,
                metric_id: 'test-metric-id',
                bus_factor_latency: 0,
                ramp_up_latency: 0,
                responsive_maintainer_latency: 0,
                license_score_latency: 0,
                good_pinning_practice_latency: 0,
                pull_request_latency: 0,
                correctness_latency: 0,
                net_score: 0.815,
                net_score_latency: 0
            });

            const result = await ratingService.calculateRating('valid-id');

            expect(result.NetScore).toBeCloseTo(0.815, 3);
            expect(result.BusFactor).toBe(0.8);
            expect(result.Correctness).toBe(0.9);
            expect(result.RampUp).toBe(0.7);
            expect(result.ResponsiveMaintainer).toBe(0.6);
            expect(result.LicenseScore).toBe(1.0);
            expect(result.GoodPinningPractice).toBe(0.8);
            expect(result.PullRequest).toBe(0.7);
        });

        it('should handle unexpected errors gracefully', async () => {
            (mockMetricService.getMetricsByVersionId as jest.Mock).mockRejectedValue(new Error('Unexpected DB error'));
            await expect(ratingService.calculateRating('valid-id')).rejects.toThrow('Unexpected DB error');
        });
    });
});

describe('RatingController', () => {
    let ratingController: RatingController;
    let mockRatingService: RatingService;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
        // Create a proper instance of RatingService with mock MetricService
        mockRatingService = new RatingService(new MockMetricService());
        // Override the method we want to mock
        mockRatingService.calculateRating = jest.fn();
        
        ratingController = new RatingController(mockRatingService);

        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });
        mockResponse = {
            status: mockStatus,
            json: mockJson
        };
    });
    describe('ratePackage', () => {
        it('should return package rating when ID is valid', async () => {
            const mockPackageId = 'test-package';
            const mockRating = {
                BusFactor: 0.5,
                Correctness: 0.8,
                RampUp: 0.7,
                ResponsiveMaintainer: 0.9,
                LicenseScore: 1.0,
                GoodPinningPractice: 0.6,
                PullRequest: 0.8,
                NetScore: 0.75,
                BusFactorLatency: 0,
                CorrectnessLatency: 0,
                RampUpLatency: 0,
                ResponsiveMaintainerLatency: 0,
                LicenseScoreLatency: 0,
                GoodPinningPracticeLatency: 0,
                PullRequestLatency: 0,
                NetScoreLatency: 0
            };

            mockRequest = {
                params: { id: mockPackageId }
            };

            mockRatingService.calculateRating = jest.fn().mockResolvedValue(mockRating);

            await ratingController.ratePackage(mockRequest as Request, mockResponse as Response);

            expect(mockRatingService.calculateRating).toHaveBeenCalledWith(mockPackageId);
            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(mockRating);
        });

        it('should return 404 when package is not found', async () => {
            mockRequest = {
                params: { id: 'non-existent-package' }
            };

            mockRatingService.calculateRating = jest.fn().mockRejectedValue(new Error('Package not found'));

            await ratingController.ratePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(404);
            expect(mockJson).toHaveBeenCalledWith({ 
                error: 'Not Found',
                message: 'Package not found' 
            });
        });

        it('should return 400 when package ID format is invalid', async () => {
            mockRequest = {
                params: { id: 'invalid@id' }
            };

            mockRatingService.calculateRating = jest.fn().mockRejectedValue(new Error('Invalid package ID format'));

            await ratingController.ratePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({ 
                error: 'Bad Request',
                message: 'Invalid package ID format' 
            });
        });

        it('should return 404 when metrics are not found', async () => {
            mockRequest = {
                params: { id: 'test-package' }
            };

            mockRatingService.calculateRating = jest.fn().mockRejectedValue(new Error('Metrics not found'));

            await ratingController.ratePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(404);
            expect(mockJson).toHaveBeenCalledWith({ 
                error: 'Not Found',
                message: 'Package metrics not found' 
            });
        });

        it('should return 500 for unexpected errors', async () => {
            mockRequest = {
                params: { id: 'test-package' }
            };

            mockRatingService.calculateRating = jest.fn().mockRejectedValue(new Error('Unexpected error'));

            await ratingController.ratePackage(mockRequest as Request, mockResponse as Response);

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({ 
                error: 'Internal Server Error',
                message: 'An unexpected error occurred while calculating package rating'
            });
        });
    });
});