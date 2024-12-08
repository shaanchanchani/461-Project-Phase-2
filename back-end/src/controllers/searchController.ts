// src/controllers/searchController.ts
import { Request, Response } from 'express';
import { SearchService } from '../services/searchService';
import { regexService } from '../services/regexService';
import { log } from '../logger';

export class SearchController {
    static async listPackages(req: Request, res: Response) {
        try {
            const { offset } = req.query;
            const query = req.body;

            // Validate that the request body is an array
            if (!Array.isArray(query)) {
                return res.status(400).json({ error: 'Request body must be an array of PackageQuery objects' });
            }

            // Check if the query is for all packages (wildcard)
            const isWildcard = query.some(q => q.Name === '*');

            const packages = await SearchService.listPackages(offset as string);
            
            // Set the offset header if there are more results
            if (packages.length === 10) { // If we got a full page
                res.set('offset', (parseInt(offset as string || '0') + 10).toString());
            }

            res.status(200).json(packages);
        } catch (error) {
            log.error('Error listing packages:', error);
            res.status(500).json({ error: 'Failed to list packages' });
        }
    }

    static async searchByRegEx(req: Request, res: Response) {
        try {
            const { RegEx } = req.body;
            const packages = await regexService.searchByRegEx(RegEx);
            res.status(200).json(packages);
        } catch (error) {
            log.error('Error searching packages:', error);
            res.status(500).json({ error: 'Failed to search packages' });
        }
    }

    static async getPackageById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            
            if (!id || typeof id !== 'string') {
                return res.status(400).json({ error: 'Invalid package ID' });
            }

            const packageData = await SearchService.getPackageById(id);
            
            if (!packageData) {
                return res.status(404).json({ error: 'Package not found' });
            }

            res.status(200).json(packageData);
        } catch (error) {
            log.error('Error getting package by ID:', error);
            res.status(500).json({ error: 'Failed to get package' });
        }
    }

    static async getPackageByName(req: Request, res: Response) {
        try {
            const { name } = req.params;
            
            if (!name || typeof name !== 'string') {
                return res.status(400).json({ error: 'Invalid package name' });
            }

            const packages = await SearchService.searchByName(name);
            
            if (packages.length === 0) {
                return res.status(404).json({ error: 'Package not found' });
            }

            res.status(200).json(packages[0]);
        } catch (error) {
            log.error('Error getting package by name:', error);
            res.status(500).json({ error: 'Failed to get package' });
        }
    }
}