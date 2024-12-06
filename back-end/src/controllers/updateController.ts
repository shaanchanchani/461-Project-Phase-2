import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { log } from '../logger';
import { packageUpdateService } from '../services/packageUpdateService';

export class UpdateController {
    public async updatePackage(req: AuthenticatedRequest, res: Response): Promise<Response> {
        try {
            const packageId = req.params.id;
            const userId = req.user?.name;
            
            if (!userId) {
                return res.status(401).json({ error: 'Authentication token required' });
            }

            const result = await packageUpdateService.updatePackage(
                packageId,
                req.body.metadata,
                req.body.data,
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
