import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { BaseDynamoService } from "./baseDynamoService";
import { DownloadTableItem } from "../../types";
import { log } from "../../logger";

const DOWNLOADS_TABLE = process.env.DYNAMODB_DOWNLOADS_TABLE || 'Downloads';

export class DownloadDynamoService extends BaseDynamoService {
    /**
     * Record a package download
     */
    async recordDownload(downloadData: DownloadTableItem): Promise<void> {
        try {    
            await this.put<'DownloadTableItem'>(DOWNLOADS_TABLE, downloadData);
            log.info(`Successfully recorded download for package ${downloadData.package_id}`);
        } catch (error) {
            log.error('Error recording download:', error);
            throw error;
        }
    }

    /**
     * Get downloads by package ID
     */
    async getDownloadsByPackageId(packageId: string): Promise<DownloadTableItem[]> {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: DOWNLOADS_TABLE,
                IndexName: 'package-id-index',
                KeyConditionExpression: 'package_id = :pid',
                ExpressionAttributeValues: {
                    ':pid': packageId
                }
            }));

            return result.Items as DownloadTableItem[] || [];
        } catch (error) {
            log.error('Error getting downloads by package ID:', error);
            throw error;
        }
    }

    protected extractKeyFromItem(tableName: string, item: Record<string, any>): Record<string, any> {
        if (tableName !== DOWNLOADS_TABLE) {
            throw new Error(`Unknown table: ${tableName}`);
        }
        return { download_id: item.download_id };
    }
}

export const downloadDynamoService = new DownloadDynamoService();
