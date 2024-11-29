// src/services/ratingService.ts
import { log } from '../logger';
import { GetNetScore } from '../metrics/netScore';
import { PackageRating, PackageCost } from '../types';
import { checkUrlType, processUrl, UrlType } from '../utils/urlUtils';

export class RatingService {
    static async calculateRating(packageId: string): Promise<PackageRating> {
        try {
            // Get package URL from your storage system using packageId
            const packageUrl = await this.getPackageUrl(packageId);
            
            // Check URL type and process it
            const urlType = checkUrlType(packageUrl);
            if (urlType === UrlType.Invalid) {
                throw new Error('Invalid package URL');
            }

            // Process URL to get owner and repo
            const { owner, repo } = await processUrl(urlType, packageUrl);
            
            log.info(`Calculating metrics for ${owner}/${repo}`);
            const scores = await GetNetScore(owner, repo, packageUrl);
            
            if (!scores) {
                throw new Error('Failed to calculate package metrics');
            }

            return {
                BusFactor: scores.BusFactor,
                BusFactorLatency: scores.BusFactor_Latency,
                Correctness: scores.Correctness,
                CorrectnessLatency: scores.Correctness_Latency,
                RampUp: scores.RampUp,
                RampUpLatency: scores.RampUp_Latency,
                ResponsiveMaintainer: scores.ResponsiveMaintainer,
                ResponsiveMaintainerLatency: scores.ResponsiveMaintainer_Latency,
                LicenseScore: scores.License,
                LicenseScoreLatency: scores.License_Latency,
                NetScore: scores.NetScore,
                NetScoreLatency: scores.NetScore_Latency,
                GoodPinningPractice: -1, 
                PullRequest: -1, 
                GoodPinningPracticeLatency: -1,
                PullRequestLatency: -1
            };
        } catch (error) {
            log.error('Error calculating rating:', error);
            throw error;
        }
    }

    static async calculateCost(packageId: string, includeDependencies: boolean): Promise<PackageCost> {
        try {
            // Get package details from your storage system
            const packageUrl = await this.getPackageUrl(packageId);
            
            // 1. Get the package size
            // 2. If includeDependencies is true, get and calculate dependency sizes
            // 3. Convert sizes to costs

            // Example response structure:
            const response: PackageCost = {
                [packageId]: {
                    totalCost: 0 // Replace with actual calculation
                }
            };

            if (includeDependencies) {
                response[packageId].standaloneCost = 0; // Replace with actual calculation
                // Add dependency costs to response
            }

            return response;
        } catch (error) {
            log.error('Error calculating package cost:', error);
            throw error;
        }
    }

    /**
     * Gets the package URL from your storage system
     * This needs to be implemented based on how you're storing package data
     */
    private static async getPackageUrl(packageId: string): Promise<string> {
        // TODO: Implement this to retrieve package URL from your storage
        throw new Error('getPackageUrl not implemented');
    }
}