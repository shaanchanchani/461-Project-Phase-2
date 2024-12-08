import { Response, Request } from 'express';
import { log } from '../logger';
import { packageUpdateService } from '../services/packageUpdateService';

export class UpdateController {
    public async updatePackage(req: Request, res: Response): Promise<Response> {
        try {
            const packageId = req.params.id;
            // Set a default user ID since auth is optional
            const userId = 'admin';

            // Validate request body structure
            if (!req.body || !req.body.metadata || !req.body.data) {
                return res.status(400).json({ error: 'Request body must include metadata and data fields' });
            }

            // Validate metadata fields according to PackageMetadata schema
            const { metadata } = req.body;
            if (!metadata.Name || !metadata.Version || !metadata.ID) {
                return res.status(400).json({ error: 'Metadata must include Name, Version, and ID fields' });
            }

            // Validate data field according to PackageData schema
            const { data } = req.body;
            if (!data.URL && !data.Content) {
                return res.status(400).json({ error: 'Data must include either URL or Content field' });
            }
            if (data.URL && data.Content) {
                return res.status(400).json({ error: 'Cannot provide both URL and Content fields' });
            }

            // Validate package ID matches
            if (packageId !== metadata.ID) {
                return res.status(400).json({ error: 'Package ID in URL must match ID in metadata' });
            }

            const result = await packageUpdateService.updatePackage(
                packageId,
                metadata,
                data,
                userId
            );

            return res.status(200).json(result);
        } catch (error: any) {
            log.error(`Error updating package: ${error.message}`);
            
            if (error.message.includes('quality requirements')) {
                return res.status(424).json({ error: 'Package failed quality requirements' });
            }
            if (error.message.includes('Invalid') || error.message.includes('must')) {
                return res.status(400).json({ error: error.message });
            }
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('Unauthorized')) {
                return res.status(401).json({ error: error.message });
            }

            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export const updateController = new UpdateController();
