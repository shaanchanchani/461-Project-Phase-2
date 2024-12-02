// src/controllers/packageController.ts
import { Response } from 'express';
import { PackageService } from '../services/packageService';
import { AuthenticatedRequest } from '../middleware/auth';
import { log } from '../logger';
import { checkUrlType, UrlType } from '../utils/urlUtils';
import { URL } from 'url';

export class PackageController {
    private packageService: PackageService;

    constructor(packageService?: PackageService) {
        this.packageService = packageService || new PackageService();
        // Bind methods to instance
        this.createPackage = this.createPackage.bind(this);
        this.getPackage = this.getPackage.bind(this);
        this.updatePackage = this.updatePackage.bind(this);
        this.resetRegistry = this.resetRegistry.bind(this);
    }

    public async createPackage(req: AuthenticatedRequest, res: Response) {
        try {
            const { Content, URL: url, JSProgram, debloat } = req.body;

            // Validate request body
            if (!Content && !url) {
                return res.status(400).json({ error: 'Must provide either Content or URL' });
            }
            if (Content && url) {
                return res.status(400).json({ error: 'Cannot provide both Content and URL' });
            }

            // Validate URL format if provided
            if (url) {
                const urlType = checkUrlType(url);
                if (urlType === UrlType.Invalid) {
                    return res.status(400).json({ 
                        error: 'Invalid URL format. Please use a valid GitHub (github.com/owner/repo) or npm (npmjs.com/package/name) URL' 
                    });
                }
            }

            // Validate Content if provided
            if (Content) {
                try {
                    // Check if it's valid base64
                    Buffer.from(Content, 'base64');
                } catch (e) {
                    return res.status(400).json({ error: 'Invalid base64 content' });
                }
            }

            // Extract package name
            let name: string;
            
            if (url) {
                // Extract name from URL
                const urlObj = new URL(url);
                if (urlObj.hostname === 'github.com') {
                    const pathParts = urlObj.pathname.split('/').filter(Boolean);
                    if (pathParts.length !== 2) {
                        return res.status(400).json({ error: 'GitHub URL must be in format: github.com/owner/repo' });
                    }
                    name = pathParts[1];
                } else {
                    // npm URL
                    const packageName = url.split('/package/')[1];
                    if (!packageName) {
                        return res.status(400).json({ error: 'npm URL must be in format: npmjs.com/package/packagename' });
                    }
                    name = packageName.split('@')[0]; // Remove version if present in URL
                }
            } else {
                // Generate default name for uploaded content
                name = `package-${Date.now()}`;
            }

            // Check if package already exists
            const existingPackage = await this.packageService.getPackageByName(name);
            if (existingPackage) {
                const errorResponse = { error: `Package ${name} already exists in the registry` };
                log.info('Package already exists:', errorResponse);
                throw new Error(`Package ${name} already exists in the registry`);
            }

            // Get version from URL if provided, otherwise use default
            let version = "1.0.0"; // Default version
            if (url) {
                try {
                    const urlObj = new URL(url);
                    if (urlObj.hostname === 'github.com') {
                        const pathParts = urlObj.pathname.split('/').filter(Boolean);
                        if (pathParts.length === 2) {
                            const [owner, repo] = pathParts;
                            version = await this.packageService.getGitHubVersion(owner, repo) || version;
                        }
                    } else if (urlObj.hostname.includes('npmjs.com')) {
                        const packageName = url.split('/package/')[1]?.split('@')[0];
                        if (packageName) {
                            version = await this.packageService.getNpmVersion(packageName) || version;
                        }
                    }
                } catch (error) {
                    log.warn('Error fetching version:', error);
                    // Continue with default version
                }
            }

            const result = await this.packageService.createPackage(
                { Content, URL: url, JSProgram, debloat },
                { 
                    Name: name, 
                    Version: version,
                    ID: `${name}-${version}` // Generate a simple ID
                }
            );

            // Format response according to spec
            res.status(201).json({
                metadata: {
                    Name: result.metadata.Name,
                    Version: result.metadata.Version,
                    ID: result.metadata.ID
                },
                data: {
                    Content: result.data.Content,
                    JSProgram: result.data.JSProgram || ""
                }
            });
        } catch (error: any) {
            log.error('Error creating package:', error);
            
            if (error.message.includes('Invalid package format')) {
                return res.status(400).json({ error: 'Invalid package format: Must be a valid npm package' });
            }
            
            if (error.message.includes('Package size exceeds limit')) {
                return res.status(400).json({ error: 'Package size must be less than 50MB' });
            }

            if (error.message.includes('already exists')) {
                return res.status(409).json({ error: error.message });
            }

            res.status(500).json({ error: 'Failed to create package' });
        }
    }

    public async getPackage(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params;
            const result = await this.packageService.getPackage(id);
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
            await this.packageService.updatePackage(id, packageData);
            res.status(200).json({ message: 'Package updated successfully' });
        } catch (error) {
            log.error('Error updating package:', error);
            res.status(500).json({ error: 'Failed to update package' });
        }
    }

    public async resetRegistry(req: AuthenticatedRequest, res: Response) {
        try {
            await this.packageService.resetRegistry();
            res.status(200).json({ message: 'Registry reset successful' });
        } catch (error) {
            if (error instanceof Error && error.message === 'Not implemented') {
                res.status(501).json({ error: 'Not implemented' });
            } else {
                log.error('Failed to reset registry:', error);
                res.status(500).json({ error: 'Failed to reset registry' });
            }
        }
    }
}

export const packageController = new PackageController();