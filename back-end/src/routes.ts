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

// Package Search and List Endpoints
router.post('/packages', asyncHandler(packageController.listPackages));
router.post('/package/byRegEx', asyncHandler(SearchController.searchByRegEx));

// Package Retrieval Endpoints
router.get('/package/:id', asyncHandler(packageController.getPackageById));

// Package Rating Endpoints
router.get('/package/:id/rate', asyncHandler(RatingController.getRating));
router.get('/package/:id/cost', asyncHandler(RatingController.getCost));

// Package Upload Endpoint
router.post('/package', asyncHandler(packageController.createPackage));

export default router;