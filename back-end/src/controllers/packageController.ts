import { Response } from 'express';
import { PackageService } from '../services/packageService';
import { PackageUploadService } from '../services/packageUploadService';
import { PackageDownloadService } from '../services/packageDownloadService';
import { AuthenticatedRequest } from '../middleware/auth';
import { log } from '../logger';

export class PackageController {
    private packageService: PackageService;
    private packageUploadService: PackageUploadService;
    private packageDownloadService: PackageDownloadService;

    constructor(
        packageService?: PackageService,
        packageUploadService?: PackageUploadService,
        packageDownloadService?: PackageDownloadService
    ) {
        this.packageService = packageService || new PackageService();
        this.packageUploadService = packageUploadService || new PackageUploadService();
        this.packageDownloadService = packageDownloadService || new PackageDownloadService();
    }

    public createPackage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { URL: url, Content, JSProgram, debloat } = req.body;
            const userId = req.user?.name;

            if (!userId) {
                return res.status(401).json({ error: 'User not authenticated' });
            }

            if (!url && !Content) {
                return res.status(400).json({ error: 'Either URL or Content must be provided' });
            }

            if (url && Content) {
                return res.status(400).json({ error: 'Cannot provide both URL and Content' });
            }

            const result = url 
                ? await this.packageUploadService.uploadPackageFromUrl(url, JSProgram, debloat, userId)
                : await this.packageUploadService.uploadPackageFromZip(Content!, JSProgram, debloat, userId);

            return res.status(201).json(result);
        } catch (error) {
            if (error instanceof Error) {
                log.error('Error in createPackage:', error);
                
                if (error.name === 'PackageQualityError') {
                    return res.status(424).json({ error: 'Package failed quality requirements' });
                }

                if (error.message.includes('already exists')) {
                    return res.status(409).json({ error: error.message });
                }

                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    public getPackage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { name } = req.params;
            const userName = req.user?.name;
            if (!userName) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const result = await this.packageDownloadService.getPackageByName(name, userName);
            res.status(200).json(result);
        } catch (error) {
            log.error('Error retrieving package:', error);
            if (error instanceof Error) {
                if (error.message === 'Package not found') {
                    return res.status(404).json({ error: 'Package not found' });
                }
                return res.status(400).json({ error: error.message });
            }
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
            const { name, version } = req.params;
            const userName = req.user?.name;
            if (!userName) {
                return res.status(401).json({ error: 'User not authenticated' });
            }
            const result = await this.packageDownloadService.getPackageVersion(name, version, userName);
            res.status(200).json(result);
        } catch (error) {
            log.error('Error retrieving package version:', error);
            if (error instanceof Error) {
                if (error.message === 'Package not found' || error.message === 'Package version not found') {
                    return res.status(404).json({ error: error.message });
                }
                return res.status(400).json({ error: error.message });
            }
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