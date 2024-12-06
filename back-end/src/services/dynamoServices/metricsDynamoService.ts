import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { BaseDynamoService } from "./baseDynamoService";
import { PackageMetricsTableItem } from "../../types";
import { log } from "../../logger";

const PACKAGE_METRICS_TABLE = process.env.DYNAMODB_PACKAGE_METRICS_TABLE || 'PackageMetrics';

export class MetricsDynamoService extends BaseDynamoService {
    /**
     * Create a new metric entry
     */
    public async createMetricEntry(metricEntry: PackageMetricsTableItem): Promise<void> {
        try {
            await this.put<'PackageMetricsTableItem'>(PACKAGE_METRICS_TABLE, metricEntry);
            log.info(`Created metric entry for version ${metricEntry.version_id}`);
        } catch (error) {
            log.error('Error creating metric entry:', error);
            throw error;
        }
    }

    /**
     * Get metrics by version ID
     */
    async getMetricsByVersionId(versionId: string): Promise<PackageMetricsTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: PACKAGE_METRICS_TABLE,
                IndexName: 'version_id-index',  // Use the GSI
                KeyConditionExpression: 'version_id = :vid',
                ExpressionAttributeValues: {
                    ':vid': versionId
                }
            }));

            return result.Items?.[0] as PackageMetricsTableItem || null;
        } catch (error) {
            log.error('Error getting metrics by version ID:', error);
            throw error;
        }
    }

    protected extractKeyFromItem(tableName: string, item: Record<string, any>): Record<string, any> {
        if (tableName !== PACKAGE_METRICS_TABLE) {
            throw new Error(`Unknown table: ${tableName}`);
        }
        return { metric_id: item.metric_id };
    }
}

export const metricsDynamoService = new MetricsDynamoService();
