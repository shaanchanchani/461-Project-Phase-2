import { Response } from 'express';
import { PackageService } from '../services/packageService';
import { PackageUploadService } from '../services/packageUploadService';
import { AuthenticatedRequest } from '../middleware/auth';
import { log } from '../logger';

export class PackageController {
    private packageService: PackageService;
    private packageUploadService: PackageUploadService;

    constructor(packageService?: PackageService, packageUploadService?: PackageUploadService) {
        this.packageService = packageService || new PackageService();
        this.packageUploadService = packageUploadService || new PackageUploadService();
    }

    public createPackage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { URL: url, JSProgram, debloat } = req.body;

            if (!url) {
                return res.status(400).json({ error: 'URL is required' });
            }

            const result = await this.packageUploadService.uploadPackageFromUrl(url, JSProgram, debloat);
            return res.status(201).json(result);
        } catch (error) {
            if (error instanceof Error) {
                log.error('Error in createPackage:', error);
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    public getPackage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await this.packageService.getPackageById(id);
            
            if (!result) {
                return res.status(404).json({ error: 'Package not found' });
            }

            res.status(200).json(result);
        } catch (error) {
            log.error('Error retrieving package:', error);
            res.status(500).json({ error: 'Failed to retrieve package' });
        }
    }

    public getPackageByName = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { name } = req.params;
            const result = await this.packageService.getPackageByName(name);
            
            if (!result) {
                return res.status(404).json({ error: 'Package not found' });
            }

            res.status(200).json(result);
        } catch (error) {
            log.error('Error retrieving package:', error);
            res.status(500).json({ error: 'Failed to retrieve package' });
        }
    }

    public getPackageVersion = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { packageId, version } = req.params;
            const result = await this.packageService.getPackageVersion(packageId, version);
            
            if (!result) {
                return res.status(404).json({ error: 'Package version not found' });
            }

            res.status(200).json(result);
        } catch (error) {
            log.error('Error retrieving package version:', error);
            res.status(500).json({ error: 'Failed to retrieve package version' });
        }
    }

    public listPackages = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const packages = await this.packageService.listPackages();
            res.status(200).json(packages);
        } catch (error) {
            log.error('Error listing packages:', error);
            res.status(500).json({ error: 'Failed to list packages' });
        }
    }

    public listPackageVersions = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { packageId } = req.params;
            const versions = await this.packageService.listPackageVersions(packageId);
            res.status(200).json(versions);
        } catch (error) {
            log.error('Error listing package versions:', error);
            res.status(500).json({ error: 'Failed to list package versions' });
        }
    }
}

// Initialize with default services
export const packageController = new PackageController();