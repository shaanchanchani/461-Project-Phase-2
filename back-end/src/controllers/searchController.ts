// src/controllers/searchController.ts
import { Request, Response } from 'express';
import { SearchService } from '../services/searchService';
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
            const packages = await SearchService.searchByRegEx(RegEx);
            res.status(200).json(packages);
        } catch (error) {
            log.error('Error searching packages:', error);
            res.status(500).json({ error: 'Failed to search packages' });
        }
    }
}