// src/services/searchService.ts
import { log } from '../logger';
import type { PackageMetadata } from '../types';
import { dynamoDBService } from './dynamoDBService';

export class SearchService {
    static async listPackages(offset?: string): Promise<PackageMetadata[]> {
        try {
            const packages = await dynamoDBService.listPackages(offset);
            return packages;
        } catch (error) {
            log.error('Error listing packages:', error);
            throw error;
        }
    }

    static async searchByRegEx(pattern: string): Promise<PackageMetadata[]> {
        // Implement regex search functionality
        throw new Error('Not implemented');
    }
}