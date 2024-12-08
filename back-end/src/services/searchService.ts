// src/services/searchService.ts
import { log } from '../logger';
import type { PackageMetadata } from '../types';
import { packageDynamoService } from './dynamoServices';

export class SearchService {
    /**
     * List all packages with optional pagination
     */
    static async listPackages(offset?: string): Promise<PackageMetadata[]> {
        try {
            const packages = await packageDynamoService.getAllPackages(offset);
            return packages.map(pkg => ({
                Name: pkg.name,
                ID: pkg.package_id,
                Version: pkg.latest_version || '0.0.0'
            }));
        } catch (error) {
            log.error('Error listing packages:', error);
            throw error;
        }
    }

    /**
     * Search packages by name (exact match)
     */
    static async searchByName(name: string): Promise<PackageMetadata[]> {
        try {
            if (!name.trim()) {
                return [];
            }
            
            const packageItem = await packageDynamoService.getPackageByName(name);
            if (!packageItem) {
                return [];
            }

            return [{
                Name: packageItem.name,
                ID: packageItem.package_id,
                Version: packageItem.latest_version || '0.0.0'
            }];
        } catch (error) {
            log.error('Error searching packages by name:', error);
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