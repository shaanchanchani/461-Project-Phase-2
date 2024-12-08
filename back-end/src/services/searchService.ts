// src/services/searchService.ts
import { log } from '../logger';
import type { PackageMetadata, PackageQuery } from '../types';
import { packageDynamoService } from './dynamoServices';

export class SearchService {
    /**
     * List packages based on query with pagination
     */
    static async listPackages(query: PackageQuery[], offset?: string): Promise<PackageMetadata[]> {
        try {
            const offsetNum = offset ? parseInt(offset) : 0;
            
            // Check if this is a wildcard query to get all packages
            const isWildcard = query.some(q => q.Name === '*');

            if (isWildcard) {
                const packages = await packageDynamoService.getAllPackages(offsetNum);
                return packages.map(pkg => ({
                    Name: pkg.name,
                    Version: pkg.latest_version,
                    ID: pkg.package_id
                }));
            }

            // Process each query
            const results: PackageMetadata[] = [];
            for (const q of query) {
                const pkg = await packageDynamoService.getPackageByName(q.Name);
                if (pkg) {
                    // If version is specified, check if it matches
                    if (q.Version && q.Version !== pkg.latest_version) {
                        continue;
                    }
                    
                    results.push({
                        Name: pkg.name,
                        Version: pkg.latest_version,
                        ID: pkg.package_id
                    });
                }
            }

            // Apply pagination
            const start = offsetNum;
            const end = start + 10; // Page size of 10
            return results.slice(start, end);
        } catch (error) {
            log.error('Error listing packages:', error);
            throw error;
        }
    }

    /**
     * Search packages by regex pattern
     */
    static async searchByRegEx(pattern: string): Promise<PackageMetadata[]> {
        try {
            // Create RegExp object from pattern
            const regex = new RegExp(pattern);
            
            // Get all packages and filter by regex
            const allPackages = await packageDynamoService.getAllPackages(0, 100);
            return allPackages
                .filter(pkg => regex.test(pkg.name))
                .map(pkg => ({
                    Name: pkg.name,
                    Version: pkg.latest_version,
                    ID: pkg.package_id
                }));
        } catch (error) {
            log.error('Error searching packages:', error);
            throw error;
        }
    }

    /**
     * Search packages by name
     */
    static async searchByName(name: string): Promise<PackageMetadata[]> {
        try {
            const pkg = await packageDynamoService.getPackageByName(name);
            if (!pkg) {
                return [];
            }

            return [{
                Name: pkg.name,
                Version: pkg.latest_version,
                ID: pkg.package_id
            }];
        } catch (error) {
            log.error('Error searching packages by name:', error);
            throw error;
        }
    }
}