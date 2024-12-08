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
                }
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
     * Update package's latest version and package ID
     */
    public async updatePackageLatestVersion(packageId: string, version: string, newPackageId: string): Promise<void> {
        try {
            await this.docClient.send(new UpdateCommand({
                TableName: PACKAGES_TABLE,
                Key: {
                    name: packageId
                },
                UpdateExpression: 'SET latest_version = :version, package_id = :newPackageId',
                ExpressionAttributeValues: {
                    ':version': version,
                    ':newPackageId': newPackageId
                }
            }));
        } catch (error) {
            log.error('Error updating package latest version:', error);
            throw error;
        }
    }

    /**
     * Update an existing package's metadata
     */
    public async updatePackage(packageData: PackageTableItem): Promise<void> {
        try {
            await this.docClient.send(new UpdateCommand({
                TableName: PACKAGES_TABLE,
                Key: {
                    package_id: packageData.package_id
                },
                UpdateExpression: 'SET #name = :name, latest_version = :version, description = :description',
                ExpressionAttributeNames: {
                    '#name': 'name'
                },
                ExpressionAttributeValues: {
                    ':name': packageData.name,
                    ':version': packageData.latest_version,
                    ':description': packageData.description
                }
            }));
        } catch (error) {
            log.error('Error updating package:', error);
            throw error;
        }
    }

    /**
     * Get all packages with optional pagination
     */
    async getAllPackages(offset?: string): Promise<PackageTableItem[]> {
        try {
            const params: any = {
                TableName: PACKAGES_TABLE,
                Limit: 10
            };

            if (offset) {
                params.ExclusiveStartKey = { name: offset };
            }

            const result = await this.docClient.send(new ScanCommand(params));
            return result.Items as PackageTableItem[] || [];
        } catch (error) {
            log.error('Error getting all packages:', error);
            throw error;
        }
    }

    /**
     * Get all packages with a specific name
     */
    async getAllPackagesByName(name: string): Promise<PackageTableItem[]> {
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

            return result.Items as PackageTableItem[] || [];
        } catch (error) {
            log.error('Error getting packages by name:', error);
            throw error;
        }
    }

    /**
     * Get all versions by package name using name-index
     */
    async getAllVersionsByName(name: string): Promise<PackageVersionTableItem[]> {
        try {
            const result = await this.docClient.send(new QueryCommand({
                TableName: PACKAGE_VERSIONS_TABLE,
                IndexName: 'name-index',
                KeyConditionExpression: '#name = :name',
                ExpressionAttributeNames: {
                    '#name': 'name'
                },
                ExpressionAttributeValues: {
                    ':name': name
                }
            }));

            return result.Items as PackageVersionTableItem[] || [];
        } catch (error) {
            log.error('Error getting versions by name:', error);
            throw error;
        }
    }

    /**
     * Get all package versions with optional pagination
     */
    async getAllPackageVersions(offset?: string): Promise<PackageVersionTableItem[]> {
        try {
            const params: any = {
                TableName: PACKAGE_VERSIONS_TABLE
            };

            if (offset) {
                params.ExclusiveStartKey = JSON.parse(offset);
            }

            const result = await this.docClient.send(new ScanCommand(params));
            return result.Items as PackageVersionTableItem[] || [];
        } catch (error) {
            log.error('Error getting all package versions:', error);
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
