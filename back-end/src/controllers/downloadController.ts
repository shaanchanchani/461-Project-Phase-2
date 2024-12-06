import { Response, Request } from 'express';
import { PackageDownloadService } from '../services/packageDownloadService';
import { log } from '../logger';

export class DownloadController {
    private packageDownloadService: PackageDownloadService;

    constructor(packageDownloadService?: PackageDownloadService,) {
        this.packageDownloadService = packageDownloadService || new PackageDownloadService();
    }

    public getPackageById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            // Set a default user ID since auth is optional
            const userId = 'admin';
            
            // Validate PackageID format
            if (!id.match(/^[a-zA-Z0-9\-]+$/)) {
                return res.status(400).json({ error: 'Invalid package ID format' });
            }

            const result = await this.packageDownloadService.getPackageById(id, userId);
            if (!result) {
                return res.status(404).json({ error: 'Package not found' });
            }

            res.status(200).json(result);
        } catch (error) {
            log.error('Error retrieving package:', error);
            if (error instanceof Error) {
                if (error.message === 'Package content not found') {
                    return res.status(404).json({ error: error.message });
                }
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to retrieve package' });
        }
    }
}

export const downloadController = new DownloadController();