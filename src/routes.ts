// src/routes.ts
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { packageController } from './controllers/packageController';
import { RatingController } from './controllers/ratingController';
import { SearchController } from './controllers/searchController';
import { AuthController, authMiddleware, AuthenticatedRequest } from './middleware/auth';
import { log } from './logger';

const router = express.Router();

// Helper for async handlers
const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>): RequestHandler => 
    (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };

// Logging middleware
router.use((req: Request, res: Response, next: NextFunction) => {
    log.info(`${req.method} ${req.path}`);
    next();
});

// Authentication endpoint (doesn't require auth middleware)
router.put('/authenticate', asyncHandler(AuthController.authenticate));

// All other endpoints require authentication
router.use(authMiddleware);

// BASELINE Endpoints
router.post('/packages', asyncHandler(SearchController.listPackages));

router.delete('/reset', (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.isAdmin) {
        res.status(401).json({ 
            error: 'You do not have permission to reset the registry' 
        });
        return;
    }
    packageController.resetRegistry(req, res, next);
});

router.post('/package/byRegEx', asyncHandler(SearchController.searchByRegEx));
router.get('/package/:id/rate', asyncHandler(RatingController.getRating));
router.get('/package/:id/cost', asyncHandler(RatingController.getCost));
router.get('/package/:id', asyncHandler(packageController.getPackage));
router.put('/package/:id', asyncHandler(packageController.updatePackage));
router.post('/package', asyncHandler(packageController.createPackage));

export default router;