
// src/controllers/packageController.ts
import { Request, Response } from 'express';
import { PackageService } from '../services/packageService';
import { log } from '../logger';

export class PackageController {
    static async createPackage(req: Request, res: Response) {
        try {
            const packageData = req.body;
            const result = await PackageService.createPackage(packageData);
            res.status(201).json(result);
        } catch (error) {
            log.error('Error creating package:', error);
            res.status(500).json({ error: 'Failed to create package' });
        }
    }

    static async getPackage(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await PackageService.getPackage(id);
            res.status(200).json(result);
        } catch (error) {
            log.error('Error retrieving package:', error);
            res.status(500).json({ error: 'Failed to retrieve package' });
        }
    }

    static async updatePackage(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const packageData = req.body;
            await PackageService.updatePackage(id, packageData);
            res.status(200).json({ message: 'Package updated successfully' });
        } catch (error) {
            log.error('Error updating package:', error);
            res.status(500).json({ error: 'Failed to update package' });
        }
    }

    static async resetRegistry(req: Request, res: Response) {
        try {
            await PackageService.resetRegistry();
            res.status(200).json({ message: 'Registry reset successful' });
        } catch (error) {
            log.error('Error resetting registry:', error);
            res.status(500).json({ error: 'Failed to reset registry' });
        }
    }
}