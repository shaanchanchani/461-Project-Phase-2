import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { log } from '../logger';
import { RatingService } from '../services/ratingService';


export class RatingController {
    private ratingService: RatingService;

    constructor(
        ratingService?: RatingService
    ) {
        this.ratingService = ratingService || new RatingService();
    }
    public ratePackage = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const userName = req.user?.name;
            
            if (!userName) {
                return res.status(401).json({ 
                    error: 'Forbidden',
                    message: 'Invalid or missing authentication token' 
                });
            }

            // Validate PackageID format
            if (!id || !id.match(/^[a-zA-Z0-9\-]+$/)) {
                return res.status(400).json({ 
                    error: 'Bad Request',
                    message: 'Invalid package ID format' 
                });
            }

            const rating = await this.ratingService.calculateRating(id);
            return res.status(200).json(rating);
        } catch (error) {
            log.error('Error calculating package rating:', error);
            
            if (error instanceof Error) {
                if (error.message.includes('Package not found')) {
                    return res.status(404).json({ 
                        error: 'Not Found',
                        message: 'Package not found' 
                    });
                }
                
                if (error.message.includes('Invalid package ID')) {
                    return res.status(400).json({ 
                        error: 'Bad Request',
                        message: 'Invalid package ID format' 
                    });
                }
            }
            
            return res.status(500).json({ 
                error: 'Internal Server Error',
                message: 'The package rating system failed to compute one or more metrics'
            });
        }
    }
}

export const ratingController = new RatingController();