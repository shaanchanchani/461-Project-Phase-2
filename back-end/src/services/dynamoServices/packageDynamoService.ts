import { QueryCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { BaseDynamoService } from "./baseDynamoService";
import { Package, PackageID, PackageTableItem, PackageVersionTableItem } from "../../types";
import { log } from "../../logger";

const PACKAGES_TABLE = process.env.DYNAMODB_PACKAGES_TABLE || 'Packages';
const PACKAGE_VERSIONS_TABLE = process.env.DYNAMODB_PACKAGE_VERSIONS_TABLE || 'PackageVersions';

export class PackageDynamoService extends BaseDynamoService {
    /**
     * Get a package by its ID, including its content
     */
    public async getPackageById(id: PackageID): Promise<Package | null> {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: PACKAGES_TABLE,
                IndexName: 'package_id-index',
                KeyConditionExpression: 'package_id = :pid',
                ExpressionAttributeValues: {
                    ':pid': id
                }
            }));

            if (!result.Items || result.Items.length === 0) {
                return null;
            }

            const packageData = result.Items[0] as PackageTableItem;
            
            const latestVersion = await this.getLatestPackageVersion(id);
            if (!latestVersion) {
                return null;
            }

            return {
                metadata: {
                    Name: packageData.name,
                    Version: latestVersion.version,
                    ID: packageData.package_id
                },
                data: {
                    Content: latestVersion.zip_file_path
                }
            };
        } catch (error) {
            log.error('Error getting package by ID:', error);
            throw error;
        }
    }

    /**
     * Get a package by its name
     */
    async getPackageByName(name: string): Promise<PackageTableItem | null> {
        try {
            log.info(`Getting package by name: ${name}`);
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

            log.info(`Found package:`, result.Items?.[0]);
            const pkg = result.Items?.[0] as PackageTableItem;
            if (pkg) {
                // Get all versions for this package
                const versions = await this.getPackageVersions(pkg.package_id);
                log.info(`Found versions for ${pkg.package_id}:`, versions);
            }

            return pkg || null;
        } catch (error) {
            log.error('Error getting package by name:', error);
            throw error;
        }
    }

    /**
     * Get latest version of a package
     */
    async getLatestPackageVersion(packageId: string): Promise<PackageVersionTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: PACKAGE_VERSIONS_TABLE,
                KeyConditionExpression: 'package_id = :packageId',
                ExpressionAttributeValues: {
                    ':packageId': packageId
                },
                ScanIndexForward: false,
                Limit: 1
            }));

            if (!result.Items || result.Items.length === 0) {
                return null;
            }

            return result.Items[0] as PackageVersionTableItem;
        } catch (error) {
            log.error('Error getting latest package version:', error);
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
     * Get all versions of a package
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
     * Get raw package data by ID
     */
    public async getRawPackageById(id: PackageID): Promise<PackageTableItem | null> {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: PACKAGES_TABLE,
                IndexName: 'package_id-index',
                KeyConditionExpression: 'package_id = :pid',
                ExpressionAttributeValues: {
                    ':pid': id
                }
            }));

            if (!result.Items || result.Items.length === 0) {
                return null;
            }

            return result.Items[0] as PackageTableItem;
        } catch (error) {
            log.error('Error getting raw package by ID:', error);
            throw error;
        }
    }

    /**
     * Create a new package entry
     */
    async createPackageEntry(packageData: PackageTableItem): Promise<void> {
        await this.put<'PackageTableItem'>(PACKAGES_TABLE, packageData);
    }

    /**
     * Create a new package version
     */
    async createPackageVersion(versionData: PackageVersionTableItem): Promise<void> {
        await this.put<'PackageVersionTableItem'>(PACKAGE_VERSIONS_TABLE, versionData);
    }

    /**
     * Update package's latest version
     */
    public async updatePackageLatestVersion(packageId: string, version: string): Promise<void> {
        try {
            await this.docClient.send(new UpdateCommand({
                TableName: PACKAGES_TABLE,
                Key: {
                    name: packageId
                },
                UpdateExpression: 'SET latest_version = :version',
                ExpressionAttributeValues: {
                    ':version': version
                }
            }));
            log.info(`Updated latest version to ${version} for package ${packageId}`);
        } catch (error) {
            log.error('Error updating package latest version:', error);
            throw error;
        }
    }

    /**
     * Update package ID and latest version
     */
    public async updatePackage(name: string, updates: { package_id: string; latest_version: string }): Promise<void> {
        try {
            await this.docClient.send(new UpdateCommand({
                TableName: PACKAGES_TABLE,
                Key: {
                    name: name
                },
                UpdateExpression: 'SET package_id = :pid, latest_version = :version',
                ExpressionAttributeValues: {
                    ':pid': updates.package_id,
                    ':version': updates.latest_version
                }
            }));
            log.info(`Updated package ${name} with new ID ${updates.package_id} and version ${updates.latest_version}`);
        } catch (error) {
            log.error('Error updating package:', error);
            throw error;
        }
    }

    /**
     * Get all packages with pagination, including all versions
     */
    async getAllPackages(offset: number = 0, limit: number = 10): Promise<PackageTableItem[]> {
        try {
            // First get all packages
            const packagesResult = await this.docClient.send(new ScanCommand({
                TableName: PACKAGES_TABLE,
                Limit: limit,
                ExclusiveStartKey: offset ? { name: offset.toString() } : undefined
            }));

            const packages = packagesResult.Items as PackageTableItem[] || [];
            const result: PackageTableItem[] = [];

            // For each package, get all its versions
            for (const pkg of packages) {
                const versions = await this.getPackageVersions(pkg.package_id);
                // Add each version as a separate package entry
                for (const version of versions) {
                    result.push({
                        ...pkg,
                        latest_version: version.version // Override latest_version with this version
                    });
                }
            }

            return result;
        } catch (error) {
            log.error('Error getting all packages:', error);
            throw error;
        }
    }

    protected extractKeyFromItem(tableName: string, item: Record<string, any>): Record<string, any> {
        switch (tableName) {
            case PACKAGES_TABLE:
                return { name: item.name };
            case PACKAGE_VERSIONS_TABLE:
                return { 
                    package_id: item.package_id,
                    version: item.version 
                };
            default:
                throw new Error(`Unknown table: ${tableName}`);
        }
    }
}

export const packageDynamoService = new PackageDynamoService();
