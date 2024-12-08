import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { BaseDynamoService } from "./baseDynamoService";
import { PackageTableItem, PackageVersionTableItem } from "../../types";
import { log } from "../../logger";

const PACKAGES_TABLE = process.env.DYNAMODB_PACKAGES_TABLE || 'Packages';
const PACKAGE_VERSIONS_TABLE = process.env.DYNAMODB_PACKAGE_VERSIONS_TABLE || 'PackageVersions';

export class PackageSearchDynamoService extends BaseDynamoService {
    /**
     * Get all versions of a package by name
     */
    async getPackageVersionsByName(name: string): Promise<PackageVersionTableItem[]> {
        try {
            log.info(`Getting versions by name: ${name}`);
            const result = await this.docClient.send(new QueryCommand({
                TableName: PACKAGE_VERSIONS_TABLE,
                IndexName: 'name-index',
                KeyConditionExpression: '#name = :name',
                ExpressionAttributeNames: {
                    '#name': 'name'
                },
                ExpressionAttributeValues: {
                    ':name': name
                },
                ScanIndexForward: false  // Get versions in descending order
            }));

            log.info(`Found versions:`, result.Items);
            return result.Items as PackageVersionTableItem[] || [];
        } catch (error) {
            log.error('Error getting package versions by name:', error);
            throw error;
        }
    }

    /**
     * Get a specific version of a package by name
     */
    async getPackageVersionByNameAndVersion(name: string, version: string): Promise<PackageVersionTableItem | null> {
        try {
            log.info(`Getting version ${version} for package ${name}`);
            const result = await this.docClient.send(new QueryCommand({
                TableName: PACKAGE_VERSIONS_TABLE,
                IndexName: 'name-index',
                KeyConditionExpression: '#name = :name',
                FilterExpression: '#version = :version',
                ExpressionAttributeNames: {
                    '#name': 'name',
                    '#version': 'version'
                },
                ExpressionAttributeValues: {
                    ':name': name,
                    ':version': version
                }
            }));

            log.info(`Found version:`, result.Items?.[0]);
            return result.Items?.[0] as PackageVersionTableItem || null;
        } catch (error) {
            log.error('Error getting package version by name and version:', error);
            throw error;
        }
    }

    /**
     * Get a package by name
     */
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

    /**
     * Get all versions of a package by ID
     */
    async getPackageVersions(packageId: string): Promise<PackageVersionTableItem[]> {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: PACKAGE_VERSIONS_TABLE,
                KeyConditionExpression: 'package_id = :packageId',
                ExpressionAttributeValues: {
                    ':packageId': packageId
                },
                ScanIndexForward: false  // Get versions in descending order
            }));

            return result.Items as PackageVersionTableItem[] || [];
        } catch (error) {
            log.error('Error getting package versions:', error);
            throw error;
        }
    }

    /**
     * Get a specific version of a package
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
     * Get all packages with pagination
     */
    async getAllPackages(offset: number = 0, limit: number = 10): Promise<PackageTableItem[]> {
        try {
            const result = await this.docClient.send(new ScanCommand({
                TableName: PACKAGES_TABLE,
                Limit: limit,
                ExclusiveStartKey: offset ? { name: offset.toString() } : undefined
            }));

            return result.Items as PackageTableItem[] || [];
        } catch (error) {
            log.error('Error getting all packages:', error);
            throw error;
        }
    }

    /**
     * Get all package versions
     */
    async getAllPackageVersions(): Promise<PackageVersionTableItem[]> {
        try {
            log.info('Getting all package versions');
            const result = await this.docClient.send(new ScanCommand({
                TableName: PACKAGE_VERSIONS_TABLE
            }));

            log.info(`Found versions:`, result.Items);
            return result.Items as PackageVersionTableItem[] || [];
        } catch (error) {
            log.error('Error getting all package versions:', error);
            throw error;
        }
    }
}

export const packageSearchDynamoService = new PackageSearchDynamoService();
