
// src/controllers/searchController.ts
import { Request, Response } from 'express';
import { SearchService } from '../services/searchService';
import { log } from '../logger';

export class SearchController {
    static async listPackages(req: Request, res: Response) {
        try {
            const { offset } = req.query;
            const packages = await SearchService.listPackages(offset as string);
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