import { metricsDynamoService, packageDynamoService } from './dynamoServices';
import { v4 as uuidv4 } from 'uuid';
import { PackageMetricsTableItem } from '../types';
import { log } from '../logger';

export class MetricService {
    protected metricsDb: any;
    protected packageDb: any;

    constructor(metricsDb?: any, packageDb?: any) {
        this.metricsDb = metricsDb || metricsDynamoService;
        this.packageDb = packageDb || packageDynamoService;
    }

    public async getLatestPackageVersion(packageId: string): Promise<{ version_id: string } | null> {
        try {
            return await this.packageDb.getLatestPackageVersion(packageId);
        } catch (error) {
            log.error('Error retrieving latest package version:', error);
            throw error;
        }
    }

    public async getMetricsByVersionId(versionId: string): Promise<PackageMetricsTableItem | null> {
        try {
            return await this.metricsDb.getMetricsByVersionId(versionId);
        } catch (error) {
            log.error('Error retrieving metrics:', error);
            throw error;
        }
    }

    public async createMetricEntry(versionId: string, metrics: {
        net_score: number;
        bus_factor: number;
        ramp_up: number;
        responsive_maintainer: number;
        license_score: number;
        good_pinning_practice: number;
        pull_request: number;
        correctness: number;
        bus_factor_latency: number;
        ramp_up_latency: number;
        responsive_maintainer_latency: number;
        license_score_latency: number;
        good_pinning_practice_latency: number;
        pull_request_latency: number;
        correctness_latency: number;
        net_score_latency: number;
    }): Promise<PackageMetricsTableItem> {
        try {
            const metricEntry: PackageMetricsTableItem = {
                metric_id: uuidv4(),
                version_id: versionId,
                net_score: metrics.net_score,
                bus_factor: metrics.bus_factor,
                ramp_up: metrics.ramp_up,
                responsive_maintainer: metrics.responsive_maintainer,
                license_score: metrics.license_score,
                good_pinning_practice: metrics.good_pinning_practice,
                pull_request: metrics.pull_request,
                correctness: metrics.correctness,
                bus_factor_latency: metrics.bus_factor_latency,
                ramp_up_latency: metrics.ramp_up_latency,
                responsive_maintainer_latency: metrics.responsive_maintainer_latency,
                license_score_latency: metrics.license_score_latency,
                good_pinning_practice_latency: metrics.good_pinning_practice_latency,
                pull_request_latency: metrics.pull_request_latency,
                correctness_latency: metrics.correctness_latency,
                net_score_latency: metrics.net_score_latency
            };

            await this.metricsDb.createMetricEntry(metricEntry);
            log.info(`Created metric entry for version ${versionId}`);
            return metricEntry;
        } catch (error) {
            log.error('Error creating metric entry:', error);
            throw error;
        }
    }
}

// Export a default instance
export const metricService = new MetricService();
