import { ResetService } from '../services/resetService';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { log } from '../logger';

export class ResetController {
    private resetService: ResetService;

    constructor(resetService?: ResetService) {
        this.resetService = resetService || new ResetService();
    }

    public resetRegistry = async (req: AuthenticatedRequest, res: Response) => {
        try {
            // Authentication check
            if (!req.user) {
                return res.status(401).json({
                    error: "Unauthorized",
                    message: "Authentication required"
                });
            }

            // Admin authorization check
            if (!req.user.isAdmin) {
                return res.status(403).json({
                    error: "Forbidden",
                    message: "Only administrators can reset the registry"
                });
            }

            // Start the reset process
            log.info('Starting registry reset process');
            await this.resetService.resetRegistry();
            log.info('Registry reset completed successfully');

            return res.status(200).json({
                status: "success",
                message: "Registry reset to default state"
            });
        } catch (error) {
            log.error('Error in resetRegistry:', error);

            // Handle specific error cases
            if (error instanceof Error) {
                if (error.message.includes('S3')) {
                    return res.status(500).json({
                        error: "Storage Error",
                        message: "Failed to clear package storage"
                    });
                }
                if (error.message.includes('DynamoDB')) {
                    return res.status(500).json({
                        error: "Database Error",
                        message: "Failed to reset database state"
                    });
                }
                if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
                    return res.status(504).json({
                        error: "Timeout Error",
                        message: "Operation timed out while resetting registry"
                    });
                }
                if (error.message.includes('admin')) {
                    return res.status(500).json({
                        error: "Configuration Error",
                        message: "Failed to restore default admin configuration"
                    });
                }
            }

            // Generic server error for unhandled cases
            return res.status(500).json({
                error: "Internal Server Error",
                message: "An unexpected error occurred while resetting the registry"
            });
        }
    }
}

export const resetController = new ResetController();