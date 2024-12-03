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
    PackageMetricsTableItem
} from '../types';
import { log } from '../logger';

const PACKAGES_TABLE = process.env.DYNAMODB_PACKAGES_TABLE || 'Packages';
const PACKAGE_VERSIONS_TABLE = process.env.DYNAMODB_PACKAGE_VERSIONS_TABLE || 'PackageVersions';
const PACKAGE_METRICS_TABLE = process.env.DYNAMODB_PACKAGE_METRICS_TABLE || 'PackageMetrics';

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
}

export const dynamoDBService = new DynamoDBService();