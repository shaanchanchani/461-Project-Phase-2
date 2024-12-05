// src/services/ratingService.ts
import { log } from '../logger';
import { PackageRating } from '../types';
import { MetricService } from './metricService';
import { DynamoDBService, dynamoDBService } from './dynamoDBService';

export class RatingService {
    private metricService: MetricService;
    private db: DynamoDBService;

    constructor(metricService?: MetricService, db?: DynamoDBService) {
        this.metricService = metricService || new MetricService();
        this.db = db || dynamoDBService;
    }

    async calculateRating(packageId: string): Promise<PackageRating> {
        try {
            if (!packageId) {
                throw new Error('Missing package ID');
            }

            // Get the latest version for the package
            const latestVersion = await this.db.getLatestPackageVersion(packageId);
            if (!latestVersion) {
                throw new Error('Package not found');
            }

            // Get metrics using the version ID
            const metrics = await this.metricService.getMetricsByVersionId(latestVersion.version_id);
            if (!metrics) {
                throw new Error('Metrics not found for package');
            }

            // Return metrics in the format specified by the API
            return {
                BusFactor: metrics.bus_factor,
                BusFactorLatency: metrics.bus_factor_latency,
                Correctness: metrics.correctness,
                CorrectnessLatency: metrics.correctness_latency,
                RampUp: metrics.ramp_up,
                RampUpLatency: metrics.ramp_up_latency,
                ResponsiveMaintainer: metrics.responsive_maintainer,
                ResponsiveMaintainerLatency: metrics.responsive_maintainer_latency,
                LicenseScore: metrics.license_score,
                LicenseScoreLatency: metrics.license_score_latency,
                GoodPinningPractice: metrics.good_pinning_practice,
                GoodPinningPracticeLatency: metrics.good_pinning_practice_latency,
                PullRequest: metrics.pull_request,
                PullRequestLatency: metrics.pull_request_latency,
                NetScore: metrics.net_score,
                NetScoreLatency: metrics.net_score_latency
            };
        } catch (error) {
            log.error('Error calculating package rating:', error);
            throw error;
        }
    }
}