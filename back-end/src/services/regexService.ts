// src/services/regexService.ts
import { log } from '../logger';
import { packageDynamoService } from './dynamoServices';
import type { PackageMetadata, PackageTableItem } from '../types';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

export class RegexService {
    private db;

    constructor(db?: any) {
        this.db = db || packageDynamoService;
    }

    /**
     * Search packages by regex pattern
     * @param pattern The regex pattern to search for
     * @returns Array of packages matching the pattern
     */
    async searchByRegEx(pattern: string): Promise<PackageMetadata[]> {
        try {
            // Validate regex pattern
            try {
                new RegExp(pattern);
            } catch (error) {
                log.error('Invalid regex pattern:', error);
                throw new Error('Invalid regex pattern');
            }

            // Create regex object
            const regex = new RegExp(pattern);

            // Scan packages table
            const result = await this.db.docClient.send(new ScanCommand({
                TableName: process.env.DYNAMODB_PACKAGES_TABLE || 'Packages'
            }));

            if (!result.Items) {
                return [];
            }

            // Filter packages that match the regex
            const matchingPackages = result.Items.filter((item: PackageTableItem) => {
                return regex.test(item.name) || 
                       regex.test(item.description) || 
                       regex.test(item.latest_version);
            });

            // Convert to PackageMetadata format
            return matchingPackages.map((item: PackageTableItem) => ({
                Name: item.name,
                Version: item.latest_version,
                ID: item.package_id
            }));

        } catch (error) {
            log.error('Error searching packages by regex:', error);
            throw error;
        }
    }

    /**
     * Validate if a package name matches exactly
     * @param name Package name to validate
     * @param pattern Regex pattern to match against
     * @returns true if the name matches the pattern exactly
     */
    validateExactMatch(name: string, pattern: string): boolean {
        try {
            const regex = new RegExp(`^${pattern}$`);
            return regex.test(name);
        } catch (error) {
            log.error('Error validating exact match:', error);
            return false;
        }
    }

    /**
     * Check if name matches with extra characters
     * @param name Package name to validate
     * @returns true if the name matches with extra characters
     */
    async extraCharsMatch(name: string): Promise<boolean> {
        try {
            // Get all packages
            const result = await this.db.docClient.send(new ScanCommand({
                TableName: process.env.DYNAMODB_PACKAGES_TABLE || 'Packages'
            }));

            if (!result.Items) {
                return false;
            }

            // Check if any package name contains the given name as a substring
            return result.Items.some((item: PackageTableItem) => 
                item.name.includes(name) && item.name !== name
            );
        } catch (error) {
            log.error('Error checking extra chars match:', error);
            return false;
        }
    }
}

// Export singleton instance
export const regexService = new RegexService();
