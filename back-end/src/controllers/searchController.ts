import { Request, Response } from 'express';
import { SearchService } from '../services/searchService';
import { log } from '../logger';
import { PackageQuery } from '../types';

export class SearchController {
    static async listPackages(req: Request, res: Response) {
        try {
            const { offset } = req.query;
            const query = req.body;

            // Validate that the request body is an array
            if (!Array.isArray(query)) {
                return res.status(400).json({ error: 'Request body must be an array of PackageQuery objects' });
            }

            // Validate each PackageQuery object
            for (const q of query) {
                if (!q.Name || typeof q.Name !== 'string') {
                    return res.status(400).json({ error: 'Each PackageQuery must have a valid Name field' });
                }
                if (q.Version && typeof q.Version !== 'string') {
                    return res.status(400).json({ error: 'Version field must be a string if provided' });
                }
            }

            const packages = await SearchService.listPackages(query as PackageQuery[], offset as string);
            
            // Check if too many packages would be returned
            if (packages.length > 100) { // Arbitrary limit, adjust as needed
                return res.status(413).json({ error: 'Too many packages returned' });
            }

            // Set the offset header if there are more results
            if (packages.length === 10) { // If we got a full page
                res.set('offset', (parseInt(offset as string || '0') + 10).toString());
            }

            return res.status(200).json(packages);
        } catch (error) {
            log.error('Error listing packages:', error);
            return res.status(500).json({ error: 'Failed to list packages' });
        }
    }

    static async searchByRegEx(req: Request, res: Response) {
        try {
            const { RegEx } = req.body;
            
            if (!RegEx || typeof RegEx !== 'string') {
                return res.status(400).json({ error: 'RegEx parameter is required and must be a string' });
            }

            try {
                // Test if the regex is valid
                new RegExp(RegEx);
            } catch (e) {
                return res.status(400).json({ error: 'Invalid regular expression' });
            }

            const packages = await SearchService.searchByRegEx(RegEx);
            
            if (packages.length === 0) {
                return res.status(404).json({ error: 'No package found under this regex' });
            }

            return res.status(200).json(packages);
        } catch (error) {
            log.error('Error searching packages:', error);
            return res.status(500).json({ error: 'Failed to search packages' });
        }
    }
}

export const searchController = new SearchController();