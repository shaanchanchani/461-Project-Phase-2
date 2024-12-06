import { DynamoDBService, dynamoDBService } from './dynamoDBService';
import { log } from '../logger';
import { PackageCost } from '../types';

export class CostService {
    private db: DynamoDBService;

    constructor() {
        this.db = dynamoDBService;
    }

    /**
     * Calculate the cost (size in MB) of a package
     * @param packageId The ID of the package
     * @param includeDependencies Whether to include dependency costs (not supported yet)
     * @returns The package cost in MB
     */
    async calculatePackageCost(packageId: string, includeDependencies: boolean = false): Promise<PackageCost> {
        try {
            // Get the latest version of the package
            const latestVersion = await this.db.getLatestPackageVersion(packageId);
            if (!latestVersion) {
                throw new Error('Package not found');
            }

            // If standalone_cost is not set, default to 0
            const standaloneCostBytes = latestVersion.standalone_cost || 0;
            const totalCostBytes = latestVersion.total_cost || standaloneCostBytes;

            // Convert bytes to MB (1 MB = 1,048,576 bytes)
            const standaloneCostMB = standaloneCostBytes / 1048576;
            const totalCostMB = totalCostBytes / 1048576;

            // Format according to PackageCost interface
            return {
                [packageId]: {
                    standaloneCost: Number(standaloneCostMB.toFixed(2)),  // Round to 2 decimal places
                    totalCost: includeDependencies ? Number(totalCostMB.toFixed(2)) : Number(standaloneCostMB.toFixed(2))
                }
            };
        } catch (error) {
            log.error(`Error calculating package cost for ${packageId}:`, error);
            throw error;
        }
    }
}

export const costService = new CostService();
