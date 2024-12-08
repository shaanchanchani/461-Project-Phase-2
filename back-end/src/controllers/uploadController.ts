import { Response, Request } from 'express';
import { PackageUploadService } from '../services/packageUploadService';
import { log } from '../logger';

export class UploadController {
    private packageUploadService: PackageUploadService;

    constructor(packageUploadService?: PackageUploadService,) {
        this.packageUploadService = packageUploadService || new PackageUploadService();
    }

    public createPackage = async (req: Request, res: Response) => {
        try {
            const { URL: url, Content, JSProgram, debloat } = req.body;
            // Set a default user ID since auth is optional
            const userId = 'admin';

            if (!url && !Content) {
                return res.status(400).json({ error: 'Either URL or Content must be provided' });
            }

            if (url && Content) {
                return res.status(400).json({ error: 'Cannot provide both URL and Content' });
            }

            // Upload package
            const result = url 
                ? await this.packageUploadService.uploadPackageFromUrl(url, JSProgram, debloat, userId)
                : await this.packageUploadService.uploadPackageFromZip(Content!, JSProgram, debloat, userId);

            return res.status(201).json(result);
        } catch (error: any) {
            log.error('Error in createPackage:', error);

            if (error instanceof Error) {
                // Handle specific error messages with appropriate status codes
                if (error.message.includes('already exists')) {
                    return res.status(409).json({ error: error.message });
                }
                
                if (error.message.includes('quality requirements')) {
                    return res.status(424).json({ error: error.message });
                }

                if (error.message.includes('exceeds limit')) {
                    return res.status(413).json({ error: error.message });
                }

                if (error.message.includes('Invalid') || 
                    error.message.includes('must') ||
                    error.message.includes('Could not find')) {
                    return res.status(400).json({ error: error.message });
                }
            }

            return res.status(500).json({ error: 'Failed to create package' });
        }
    };
}

export const uploadController = new UploadController();