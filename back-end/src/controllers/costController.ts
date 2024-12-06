import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { CostService, costService } from '../services/costService';
import { log } from '../logger';

export class CostController {
    private costService: CostService;

    constructor(costService?: CostService) {
        this.costService = costService || new CostService();
    }

    public getPackageCost = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const packageId = req.params.id;
            const includeDependencies = req.query.includeDependencies === 'true';

            if (!packageId) {
                return res.status(400).json({ error: 'Package ID is required' });
            }

            try {
                const cost = await this.costService.calculatePackageCost(packageId, includeDependencies);
                return res.status(200).json(cost);
            } catch (error: any) {
                log.error(`Error calculating package cost: ${error.message}`);
                
                if (error.message === 'Package not found') {
                    return res.status(404).json({ error: 'Package not found' });
                }
                
                return res.status(500).json({ error: 'Failed to calculate package cost' });
            }
        } catch (error: any) {
            log.error('Unexpected error in cost controller:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export const costController = new CostController();
