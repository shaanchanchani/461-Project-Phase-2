// src/services/dynamoDBService.ts
import { 
    CreateTableCommand,
    CreateTableCommandInput,
    DynamoDBClient,
    ScalarAttributeType,
    KeyType,
    BillingMode,
    ListTablesCommand,
    DescribeTableCommand
} from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    PutCommand,
    QueryCommand,
    GetCommand
} from "@aws-sdk/lib-dynamodb";
import { createHash } from 'crypto';
import { 
    Package, 
    PackageID, 
    PackageTableItem,
    PackageVersionTableItem,
    PackageMetricsTableItem,
    DownloadTableItem
} from '../types';
import { log } from '../logger';

const PACKAGES_TABLE = process.env.DYNAMODB_PACKAGES_TABLE || 'Packages';
const PACKAGE_VERSIONS_TABLE = process.env.DYNAMODB_PACKAGE_VERSIONS_TABLE || 'PackageVersions';
const PACKAGE_METRICS_TABLE = process.env.DYNAMODB_PACKAGE_METRICS_TABLE || 'PackageMetrics';
const DOWNLOADS_TABLE = process.env.DYNAMODB_DOWNLOADS_TABLE || 'Downloads';

export class DynamoDBService {
    private readonly docClient: DynamoDBDocumentClient;
    private readonly baseClient: DynamoDBClient;

    constructor() {
        const config = {
            region: process.env.AWS_REGION || 'local',
            endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local'
            }
        };

        this.baseClient = new DynamoDBClient(config);
        this.docClient = DynamoDBDocumentClient.from(this.baseClient, {
            marshallOptions: {
                removeUndefinedValues: true,
            }
        });
    }

    async put(tableName: string, item: any): Promise<void> {
        try {
            await this.docClient.send(new PutCommand({
                TableName: tableName,
                Item: item
            }));
            log.info(`Successfully put item in ${tableName}`);
        } catch (error) {
            log.error(`Error putting item in ${tableName}:`, error);
            throw error;
        }
    }

    async getPackageByName(name: string): Promise<PackageTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: PACKAGES_TABLE,
                KeyConditionExpression: '#name = :name',
                ExpressionAttributeNames: {
                    '#name': 'name'
                },
                ExpressionAttributeValues: {
                    ':name': name
                }
            }));

            return result.Items?.[0] as PackageTableItem || null;
        } catch (error) {
            log.error('Error getting package by name:', error);
            throw error;
        }
    }

    async createPackageEntry(packageData: PackageTableItem): Promise<void> {
        try {
            // Check if package already exists
            const existingPackage = await this.getPackageByName(packageData.name);
            if (existingPackage) {
                throw new Error(`Package ${packageData.name} already exists`);
            }

            await this.put(PACKAGES_TABLE, packageData);
        } catch (error) {
            log.error('Error creating package entry:', error);
            throw error;
        }
    }

    async createPackageVersion(versionData: PackageVersionTableItem): Promise<void> {
        try {
            await this.put(PACKAGE_VERSIONS_TABLE, versionData);
        } catch (error) {
            log.error('Error creating package version:', error);
            throw error;
        }
    }

    public async createMetricEntry(metricEntry: PackageMetricsTableItem): Promise<void> {
        try {
            const params = {
                TableName: PACKAGE_METRICS_TABLE,
                Item: metricEntry,
                ConditionExpression: 'attribute_not_exists(metric_id)'
            };

            await this.docClient.send(new PutCommand(params));
            log.info(`Created metric entry for version ${metricEntry.version_id}`);
        } catch (error) {
            log.error('Error creating metric entry:', error);
            throw error;
        }
    }

    public async getMetricsByVersionId(versionId: string): Promise<PackageMetricsTableItem | null> {
        try {
            const params = {
                TableName: PACKAGE_METRICS_TABLE,
                IndexName: 'version_id-index',
                KeyConditionExpression: 'version_id = :versionId',
                ExpressionAttributeValues: {
                    ':versionId': versionId
                }
            };

            const result = await this.docClient.send(new QueryCommand(params));
            return result.Items?.[0] as PackageMetricsTableItem || null;
        } catch (error) {
            log.error('Error getting metrics by version ID:', error);
            throw error;
        }
    }

    /**
     * Get all versions of a package
     * @param packageId The ID of the package
     * @returns Array of package version items
     */
    async getPackageVersions(packageId: string): Promise<PackageVersionTableItem[]> {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: PACKAGE_VERSIONS_TABLE,
                KeyConditionExpression: 'package_id = :packageId',
                ExpressionAttributeValues: {
                    ':packageId': packageId
                }
            }));

            return result.Items as PackageVersionTableItem[] || [];
        } catch (error) {
            log.error('Error getting package versions:', error);
            throw error;
        }
    }

    /**
     * Get a specific version of a package
     * @param packageId The ID of the package
     * @param version The version string
     * @returns Package version item if found, null otherwise
     */
    async getPackageVersion(packageId: string, version: string): Promise<PackageVersionTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: PACKAGE_VERSIONS_TABLE,
                KeyConditionExpression: 'package_id = :packageId AND version = :version',
                ExpressionAttributeValues: {
                    ':packageId': packageId,
                    ':version': version
                }
            }));

            return result.Items?.[0] as PackageVersionTableItem || null;
        } catch (error) {
            log.error('Error getting package version:', error);
            throw error;
        }
    }

    /**
     * Get latest version of a package
     * @param packageId The ID of the package
     * @returns Latest package version item if found, null otherwise
     */
    async getLatestPackageVersion(packageId: string): Promise<PackageVersionTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: PACKAGE_VERSIONS_TABLE,
                KeyConditionExpression: 'package_id = :packageId',
                ExpressionAttributeValues: {
                    ':packageId': packageId
                },
                ScanIndexForward: false, // Sort in descending order
                Limit: 1 // Get only the latest version
            }));

            return result.Items?.[0] as PackageVersionTableItem || null;
        } catch (error) {
            log.error('Error getting latest package version:', error);
            throw error;
        }
    }

    /**
     * Record a package download in the downloads table
     * @param downloadData The download data to record
     */
    async recordDownload(downloadData: DownloadTableItem): Promise<void> {
        try {
            await this.put(DOWNLOADS_TABLE, downloadData);
            log.info(`Successfully recorded download for package ${downloadData.package_id}`);
        } catch (error) {
            log.error('Error recording download:', error);
            throw error;
        }
    }
}

export const dynamoDBService = new DynamoDBService();