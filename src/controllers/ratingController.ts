
// src/controllers/ratingController.ts
import { Request, Response } from 'express';
import { RatingService } from '../services/ratingService';
import { log } from '../logger';

export class RatingController {
    static async getRating(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const rating = await RatingService.calculateRating(id);
            res.status(200).json(rating);
        } catch (error) {
            log.error('Error calculating rating:', error);
            res.status(500).json({ error: 'Failed to calculate rating' });
        }
    }

    static async getCost(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { dependency } = req.query;
            const cost = await RatingService.calculateCost(id, dependency === 'true');
            res.status(200).json(cost);
        } catch (error) {
            log.error('Error calculating cost:', error);
            res.status(500).json({ error: 'Failed to calculate cost' });
        }
    }
}