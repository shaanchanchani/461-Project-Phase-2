// src/services/searchService.ts
import { log } from '../logger';
import type { PackageMetadata, PackageQuery } from '../types';
import { packageDynamoService } from './dynamoServices';
import semver from 'semver';

export class SearchService {
    /**
     * List all packages with optional pagination
     */
    static async listPackages(offset?: string): Promise<PackageMetadata[]> {
        try {
            const versions = await packageDynamoService.getAllPackageVersions(offset);
            return versions.map(version => ({
                Name: version.name,
                ID: version.package_id,
                Version: version.version
            }));
        } catch (error) {
            log.error('Error listing packages:', error);
            throw error;
        }
    }

    /**
     * Search packages by queries
     */
    static async searchPackages(queries: PackageQuery[], offset?: string): Promise<PackageMetadata[]> {
        try {
            // If any query has Name = "*", return all packages
            if (queries.some(q => q.Name === '*')) {
                return this.listPackages(offset);
            }

            // Process each query and combine results (OR relationship)
            const results: PackageMetadata[] = [];

            for (const query of queries) {
                try {
                    // Get all versions for this package name
                    const versions = await packageDynamoService.getAllVersionsByName(query.Name);
                    
                    if (query.Version) {
                        // Filter versions based on version constraint
                        const matchingVersions = versions.filter(v => {
                            const queryVersion = query.Version as string;
                            if (queryVersion.includes('-')) {
                                const [min, max] = queryVersion.split('-');
                                return semver.gte(v.version, min) && semver.lte(v.version, max);
                            } else if (queryVersion.startsWith('^')) {
                                return semver.satisfies(v.version, queryVersion);
                            } else if (queryVersion.startsWith('~')) {
                                return semver.satisfies(v.version, queryVersion);
                            } else {
                                return semver.eq(v.version, queryVersion);
                            }
                        });

                        // Add all matching versions
                        matchingVersions.forEach(version => {
                            results.push({
                                Name: version.name,
                                ID: version.package_id,
                                Version: version.version
                            });
                        });
                    } else {
                        // No version specified, add all versions
                        versions.forEach(version => {
                            results.push({
                                Name: version.name,
                                ID: version.package_id,
                                Version: version.version
                            });
                        });
                    }
                } catch (error) {
                    log.error('Error processing package query:', error);
                    throw error;
                }
            }

            return results;
        } catch (error) {
            log.error('Error searching packages:', error);
            throw error;
        }
    }

    /**
     * Get package by ID
     */
    static async getPackageById(id: string): Promise<PackageMetadata | null> {
        try {
            const packageItem = await packageDynamoService.getRawPackageById(id);
            if (!packageItem) {
                return null;
            }

            return {
                Name: packageItem.name,
                ID: packageItem.package_id,
                Version: packageItem.latest_version || '0.0.0'
            };
        } catch (error) {
            log.error('Error getting package by ID:', error);
            throw error;
        }
    }
}