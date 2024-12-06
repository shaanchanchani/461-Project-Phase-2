import { Response, Request } from 'express';
import { log } from '../logger';
import { RatingService } from '../services/ratingService';


export class RatingController {
    private ratingService: RatingService;

    constructor(
        ratingService?: RatingService
    ) {
        this.ratingService = ratingService || new RatingService();
    }
    public ratePackage = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            // Set a default user ID since auth is optional
            const userId = 'admin';

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