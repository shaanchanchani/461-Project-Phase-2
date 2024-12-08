// src/services/searchService.ts
import { log } from '../logger';
import type { PackageMetadata, PackageQuery, PackageResponse } from '../types';
import { packageSearchDynamoService } from './dynamoServices/searchDynamoService';

export class SearchService {
    /**
     * List packages based on query with pagination
     */
    static async listPackages(packages: PackageQuery[]): Promise<PackageResponse[]> {
        try {
            const results: PackageResponse[] = [];
            const seenVersions = new Set<string>(); // Track unique version+name combinations
            
            // Check if this is a wildcard query to get all packages
            const isWildcard = packages.some(q => q.Name === '*');
            if (isWildcard) {
                log.info('Processing wildcard query');
                const allVersions = await packageSearchDynamoService.getAllPackageVersions();
                log.info(`Found all versions:`, allVersions);
                allVersions.forEach(version => {
                    const key = `${version.name}:${version.version}`;
                    if (!seenVersions.has(key)) {
                        seenVersions.add(key);
                        results.push({
                            Name: version.name,
                            Version: version.version,
                            ID: version.package_id
                        });
                    }
                });
                return results;
            }

            for (const pkg of packages) {
                log.info(`Processing package query:`, pkg);
                if (pkg.Version) {
                    // If version is specified, get that specific version
                    const version = await packageSearchDynamoService.getPackageVersionByNameAndVersion(pkg.Name, pkg.Version);
                    log.info(`Found specific version:`, version);
                    if (version) {
                        const key = `${pkg.Name}:${version.version}`;
                        if (!seenVersions.has(key)) {
                            seenVersions.add(key);
                            results.push({
                                Name: pkg.Name,
                                Version: version.version,
                                ID: version.package_id
                            });
                        }
                    }
                } else {
                    // If no version specified, get all versions
                    const versions = await packageSearchDynamoService.getPackageVersionsByName(pkg.Name);
                    log.info(`Found all versions:`, versions);
                    versions.forEach(version => {
                        const key = `${pkg.Name}:${version.version}`;
                        if (!seenVersions.has(key)) {
                            seenVersions.add(key);
                            results.push({
                                Name: pkg.Name,
                                Version: version.version,
                                ID: version.package_id
                            });
                        }
                    });
                }
            }

            log.info(`Final results:`, results);
            return results;
        } catch (error) {
            log.error('Error in listPackages:', error);
            throw error;
        }
    }

    /**
     * Search packages by regex pattern
     */
    static async searchByRegEx(pattern: string): Promise<PackageResponse[]> {
        try {
            log.info(`Searching packages by regex: ${pattern}`);
            const regex = new RegExp(pattern);
            
            // Get all package versions and filter by regex
            const allVersions = await packageSearchDynamoService.getAllPackageVersions();
            log.info(`Found all versions:`, allVersions);

            // Use a Set to track unique name+version combinations
            const seenVersions = new Set<string>();
            const results: PackageResponse[] = [];

            allVersions.forEach(version => {
                if (regex.test(version.name)) {
                    const key = `${version.name}:${version.version}`;
                    if (!seenVersions.has(key)) {
                        seenVersions.add(key);
                        results.push({
                            Name: version.name,
                            Version: version.version,
                            ID: version.package_id
                        });
                    }
                }
            });

            log.info(`Found matching packages:`, results);
            return results;
        } catch (error) {
            log.error('Error searching packages by regex:', error);
            throw error;
        }
    }

    /**
     * Search packages by name
     */
    static async searchByName(name: string): Promise<PackageResponse[]> {
        try {
            const pkg = await packageSearchDynamoService.getPackageByName(name);
            if (!pkg) {
                return [];
            }

            const versions = await packageSearchDynamoService.getPackageVersions(pkg.package_id);
            return versions.map(version => ({
                Name: pkg.name,
                Version: version.version,
                ID: version.package_id
            }));
        } catch (error) {
            log.error('Error searching by name:', error);
            throw error;
        }
    }
}