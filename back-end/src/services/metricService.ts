import { DynamoDBService, dynamoDBService } from './dynamoDBService';
import { v4 as uuidv4 } from 'uuid';
import { PackageMetricsTableItem } from '../types';
import { log } from '../logger';

export class MetricService {
    private db: DynamoDBService;

    constructor(db?: DynamoDBService) {
        this.db = db || dynamoDBService;
    }

    public async createMetricEntry(versionId: string, metrics: {
        net_score: number;
        bus_factor: number;
        ramp_up: number;
        license_score: number;
        correctness: number;
        dependency_pinning: number;
        pull_request_review: number;
    }): Promise<PackageMetricsTableItem> {
        try {
            const metricEntry: PackageMetricsTableItem = {
                metric_id: uuidv4(),
                version_id: versionId,
                net_score: metrics.net_score,
                bus_factor: metrics.bus_factor,
                ramp_up: metrics.ramp_up,
                license_score: metrics.license_score,
                correctness: metrics.correctness,
                dependency_pinning: metrics.dependency_pinning || 0, // Default to 0 if not provided
                pull_request_review: metrics.pull_request_review || 0 // Default to 0 if not provided
            };

            await this.db.createMetricEntry(metricEntry);
            log.info(`Created metric entry for version ${versionId}`);
            return metricEntry;
        } catch (error) {
            log.error('Error creating metric entry:', error);
            throw error;
        }
    }

    public async getMetricsByVersionId(versionId: string): Promise<PackageMetricsTableItem | null> {
        try {
            return await this.db.getMetricsByVersionId(versionId);
        } catch (error) {
            log.error('Error retrieving metrics:', error);
            throw error;
        }
    }
}

// Export a default instance
export const metricService = new MetricService();
