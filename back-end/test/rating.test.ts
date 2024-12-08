import { RatingService } from '../src/services/ratingService';
import { PackageRating, PackageMetricsTableItem } from '../src/types';
import { MetricService } from '../src/services/metricService';

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
        
        // Override db methods with mock implementations
        this.metricsDb = {
            ...mockDb,
            getMetricsByVersionId: async () => this.mockMetrics
        };
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

        it('should throw error for non-existent package', async () => {
            mockMetricService.setMockVersion(null);
            await expect(ratingService.calculateRating('valid-id')).rejects.toThrow('Package not found');
        });

        it('should throw error for missing metrics', async () => {
            mockMetricService.setMockMetrics(null);
            await expect(ratingService.calculateRating('valid-id')).rejects.toThrow('Metrics not found');
        });

        it('should return -1 for unsupported metrics', async () => {
            const mockMetrics: Partial<PackageMetricsTableItem> = {
                version_id: 'test-version',
                metric_id: 'test-metric',
                // Only set some metrics, others should default to -1
                bus_factor: 0.8,
                correctness: 0.9
            };

            mockMetricService.setMockMetrics(mockMetrics as PackageMetricsTableItem);
            const result = await ratingService.calculateRating('valid-id');

            expect(result.BusFactor).toBe(0.8);
            expect(result.Correctness).toBe(0.9);
            expect(result.RampUp).toBe(-1);
            expect(result.ResponsiveMaintainer).toBe(-1);
            expect(result.NetScore).toBe(-1); // NetScore should be -1 if any required metric is missing
        });

        it('should handle invalid metric values', async () => {
            const mockMetrics: Partial<PackageMetricsTableItem> = {
                version_id: 'test-version',
                metric_id: 'test-metric',
                bus_factor: NaN,
                correctness: null as any,
                ramp_up: undefined as any
            };

            mockMetricService.setMockMetrics(mockMetrics as PackageMetricsTableItem);
            const result = await ratingService.calculateRating('valid-id');

            expect(result.BusFactor).toBe(-1);
            expect(result.Correctness).toBe(-1);
            expect(result.RampUp).toBe(-1);
        });

        it('should calculate net score correctly when all required metrics are available', async () => {
            const mockMetrics: Partial<PackageMetricsTableItem> = {
                version_id: 'test-version',
                metric_id: 'test-metric',
                bus_factor: 0.8,
                correctness: 0.9,
                ramp_up: 0.7,
                responsive_maintainer: 0.6,
                license_score: 1.0,
                // Optional metrics
                good_pinning_practice: 0.5,
                pull_request: 0.4
            };

            mockMetricService.setMockMetrics(mockMetrics as PackageMetricsTableItem);
            const result = await ratingService.calculateRating('valid-id');

            // Expected net score: (0.8 * 0.2) + (0.9 * 0.2) + (0.7 * 0.2) + (0.6 * 0.2) + (1.0 * 0.2) = 0.8
            expect(result.NetScore).toBeCloseTo(0.8, 2);
            expect(result.BusFactor).toBe(0.8);
            expect(result.Correctness).toBe(0.9);
            expect(result.RampUp).toBe(0.7);
            expect(result.ResponsiveMaintainer).toBe(0.6);
            expect(result.LicenseScore).toBe(1.0);
            expect(result.GoodPinningPractice).toBe(0.5);
            expect(result.PullRequest).toBe(0.4);
        });

        it('should handle all latency metrics', async () => {
            const mockMetrics: Partial<PackageMetricsTableItem> = {
                version_id: 'test-version',
                metric_id: 'test-metric',
                bus_factor_latency: 100,
                correctness_latency: 200,
                ramp_up_latency: 300,
                responsive_maintainer_latency: 400,
                license_score_latency: 500,
                good_pinning_practice_latency: 600,
                pull_request_latency: 700,
                net_score_latency: 800
            };

            mockMetricService.setMockMetrics(mockMetrics as PackageMetricsTableItem);
            const result = await ratingService.calculateRating('valid-id');

            expect(result.BusFactorLatency).toBe(100);
            expect(result.CorrectnessLatency).toBe(200);
            expect(result.RampUpLatency).toBe(300);
            expect(result.ResponsiveMaintainerLatency).toBe(400);
            expect(result.LicenseScoreLatency).toBe(500);
            expect(result.GoodPinningPracticeLatency).toBe(600);
            expect(result.PullRequestLatency).toBe(700);
            expect(result.NetScoreLatency).toBe(800);
        });

        it('should throw generic error for unexpected failures', async () => {
            // Mock a failure in the metric service
            jest.spyOn(mockMetricService, 'getMetricsByVersionId').mockImplementation(() => {
                throw new Error('Unexpected DB error');
            });
            await expect(ratingService.calculateRating('valid-id')).rejects.toThrow('Failed to calculate package metrics');
        });
    });
});
