// src/controllers/packageController.ts
import { Response, NextFunction } from 'express';
import { PackageService } from '../services/packageService';
import { AuthenticatedRequest } from '../middleware/auth';
import { log } from '../logger';

export class PackageController {
    public async createPackage(req: AuthenticatedRequest, res: Response) {
        try {
            const { Content, URL, JSProgram, debloat } = req.body.data || {};
            const metadata = req.body.metadata;

            const result = await PackageService.createPackage(
                { Content, URL, JSProgram, debloat },
                metadata
            );

            res.status(201).json(result);
        } catch (error: any) {
            log.error('Error creating package:', error);
            
            if (error.message.includes('Must provide either Content or URL')) {
                res.status(400).json({ error: error.message });
                return;
            }
            
            if (error.message.includes('Missing required')) {
                res.status(400).json({ error: error.message });
                return;
            }
            
            if (error.message.includes('Package already exists')) {
                res.status(409).json({ error: error.message });
                return;
            }

            res.status(500).json({ error: 'Failed to create package' });
        }
    }

    public async getPackage(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params;
            const result = await PackageService.getPackage(id);
            res.status(200).json(result);
        } catch (error: any) {
            log.error('Error retrieving package:', error);
            
            if (error.message === 'Package not found') {
                res.status(404).json({ error: 'Package not found' });
                return;
            }
            
            res.status(500).json({ error: 'Failed to retrieve package' });
        }
    }

    public async updatePackage(req: AuthenticatedRequest, res: Response) {
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

    public async resetRegistry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            await PackageService.resetRegistry();
            res.status(200).json({ message: 'Registry reset successful' });
        } catch (error) {
            log.error('Error resetting registry:', error);
            res.status(500).json({ error: 'Failed to reset registry' });
        }
    }
}

export const packageController = new PackageController();