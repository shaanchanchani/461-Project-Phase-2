// src/controllers/trackController.ts
import { Request, Response } from 'express';
import { log } from '../logger';

export class TrackController {
    async getTrack(_req: Request, res: Response): Promise<void> {
        try {
            log.info('GET /tracks endpoint hit');
            // Return the tracks we're implementing
            // You can modify this array based on which tracks you're actually implementing
            const tracks = [
                "None"
            ];
            
            log.info(`Successfully retrieved tracks: ${JSON.stringify(tracks)}`);
            res.status(200).json({
                tracks: tracks
            });
        } catch (error) {
            log.error('Error getting track information:', error);
            res.status(500).json({ error: 'The system encountered an error while retrieving the student\'s track information.' });
        }
    }
}

export const trackController = new TrackController();
