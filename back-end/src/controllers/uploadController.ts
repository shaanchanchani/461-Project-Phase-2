import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { PackageUploadService } from '../services/packageUploadService';
import { log } from '../logger';

export class UploadController {
    private packageUploadService: PackageUploadService;

    constructor(packageUploadService?: PackageUploadService,) {
        this.packageUploadService = packageUploadService || new PackageUploadService();
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
            log.error('Error in createPackage:', error);

            if (error instanceof Error) {
                if (error.message.includes('already exists')) {
                    return res.status(409).json({ error: error.message });
                }
                
                if (error.message.includes('failed quality requirements')) {
                    return res.status(424).json({ error: error.message });
                }

                if (error.message.includes('Authentication failed')) {
                    return res.status(401).json({ error: error.message });
                }

                if (error.message.includes('Invalid request')) {
                    return res.status(400).json({ error: error.message });
                }

                return res.status(400).json({ error: error.message });
            }
            
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export const uploadController = new UploadController();