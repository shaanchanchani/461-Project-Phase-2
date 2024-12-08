import { MetricService, metricService as defaultMetricService } from './metricService';
import { PackageRating } from '../types';
import { log } from '../logger';

export class RatingService {
    private metricService: MetricService;

    constructor(metricService?: MetricService) {
        this.metricService = metricService || defaultMetricService;
    }

    private validateMetricValue(value: number | null | undefined): number {
        // Return -1 for null, undefined or invalid metric values
        return typeof value === 'number' && !isNaN(value) ? value : -1;
    }

    private calculateNetScore(metrics: {
        bus_factor: number | null | undefined;
        correctness: number | null | undefined;
        ramp_up: number | null | undefined;
        responsive_maintainer: number | null | undefined;
        license_score: number | null | undefined;
        good_pinning_practice: number | null | undefined;
        pull_request: number | null | undefined;
    }): number {
        // Get individual scores, using -1 for any missing/invalid metrics
        const busFactor = this.validateMetricValue(metrics.bus_factor);
        const correctness = this.validateMetricValue(metrics.correctness);
        const rampUp = this.validateMetricValue(metrics.ramp_up);
        const responsiveMaintainer = this.validateMetricValue(metrics.responsive_maintainer);
        const licenseScore = this.validateMetricValue(metrics.license_score);
        const goodPinningPractice = this.validateMetricValue(metrics.good_pinning_practice);
        const pullRequest = this.validateMetricValue(metrics.pull_request);

        // If any metric is -1, return -1 as the net score
        if ([busFactor, correctness, rampUp, responsiveMaintainer, licenseScore, goodPinningPractice, pullRequest].includes(-1)) {
            return -1;
        }

        // Calculate net score using the formula
        return 0.3 * licenseScore + 
               0.2 * busFactor + 
               0.2 * responsiveMaintainer + 
               0.1 * correctness + 
               0.1 * rampUp + 
               0.05 * goodPinningPractice + 
               0.05 * pullRequest;
    }

    public async calculateRating(packageId: string): Promise<PackageRating> {
        log.info(`Calculating rating for package ${packageId}`);
        
        // Validate package ID format
        if (!packageId || !packageId.match(/^[a-zA-Z0-9\-]+$/)) {
            log.warn(`Invalid package ID format: ${packageId}`);
            throw new Error('Invalid package ID format');
        }

        try {
            // Get latest version
            log.info(`Getting latest version for package ${packageId}`);
            const latestVersion = await this.metricService.getLatestPackageVersion(packageId);
            if (!latestVersion) {
                log.warn(`Package not found: ${packageId}`);
                throw new Error('Package not found');
            }
            log.info(`Found latest version: ${JSON.stringify(latestVersion)}`);

            // Get metrics for latest version
            log.info(`Getting metrics for version ${latestVersion.version_id}`);
            const metrics = await this.metricService.getMetricsByVersionId(latestVersion.version_id);
            
            // If no metrics found, return default values (-1) for all metrics
            if (!metrics) {
                log.info(`No metrics found for package ${packageId}, returning default values`);
                return {
                    BusFactor: -1,
                    Correctness: -1,
                    RampUp: -1,
                    ResponsiveMaintainer: -1,
                    LicenseScore: -1,
                    GoodPinningPractice: -1,
                    PullRequest: -1,
                    NetScore: -1,
                    BusFactorLatency: -1,
                    CorrectnessLatency: -1,
                    RampUpLatency: -1,
                    ResponsiveMaintainerLatency: -1,
                    LicenseScoreLatency: -1,
                    GoodPinningPracticeLatency: -1,
                    PullRequestLatency: -1,
                    NetScoreLatency: -1
                };
            }
            log.info(`Found metrics: ${JSON.stringify(metrics)}`);

            // Calculate net score based on other metrics
            const netScore = this.calculateNetScore(metrics);
            log.info(`Calculated net score: ${netScore}`);

            // Map metrics to PackageRating format with validation
            const rating = {
                BusFactor: this.validateMetricValue(metrics.bus_factor),
                Correctness: this.validateMetricValue(metrics.correctness),
                RampUp: this.validateMetricValue(metrics.ramp_up),
                ResponsiveMaintainer: this.validateMetricValue(metrics.responsive_maintainer),
                LicenseScore: this.validateMetricValue(metrics.license_score),
                GoodPinningPractice: this.validateMetricValue(metrics.good_pinning_practice),
                PullRequest: this.validateMetricValue(metrics.pull_request),
                NetScore: netScore,
                BusFactorLatency: this.validateMetricValue(metrics.bus_factor_latency),
                CorrectnessLatency: this.validateMetricValue(metrics.correctness_latency),
                RampUpLatency: this.validateMetricValue(metrics.ramp_up_latency),
                ResponsiveMaintainerLatency: this.validateMetricValue(metrics.responsive_maintainer_latency),
                LicenseScoreLatency: this.validateMetricValue(metrics.license_score_latency),
                GoodPinningPracticeLatency: this.validateMetricValue(metrics.good_pinning_practice_latency),
                PullRequestLatency: this.validateMetricValue(metrics.pull_request_latency),
                NetScoreLatency: this.validateMetricValue(metrics.net_score_latency)
            };
            log.info(`Returning rating: ${JSON.stringify(rating)}`);
            return rating;
        } catch (error) {
            log.error(`Error calculating rating for package ${packageId}:`, error);
            throw error;
        }
    }
}

// Export a default instance
export const ratingService = new RatingService();