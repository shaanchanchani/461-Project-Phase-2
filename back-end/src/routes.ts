// src/routes.ts
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
// import { packageController } from './controllers/packageController';
import { SearchController } from './controllers/searchController';
import { resetController } from './controllers/resetController';
import { costController } from './controllers/costController';
import { uploadController } from './controllers/uploadController';
import { ratingController } from './controllers/ratingController';
import {downloadController} from './controllers/downloadController'
// import { AuthController, authMiddleware, AuthenticatedRequest } from './middleware/auth';
import { log } from './logger';
import { updateController } from './controllers/updateController';
import { trackController } from './controllers/trackController';

const router = express.Router();

// Helper for async handlers
const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>): RequestHandler => 
    (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };

// Logging middleware
router.use((req: Request, res: Response, next: NextFunction) => {
    log.info(`${req.method} ${req.path}`);
    log.info('Request headers:', req.headers);
    log.info('Request body:', req.body);
    next();
});

// Authentication endpoint (doesn't require auth middleware)
// router.put('/authenticate', asyncHandler(async (req: Request, res: Response) => {
//     log.info('=== Authentication Request ===');
//     log.info('Headers:', req.headers);
//     log.info('Body:', req.body);
//     await AuthController.authenticate(req, res);
// }));

// Tracks endpoint
router.get('/tracks', asyncHandler(async (req: Request, res: Response) => {
    log.info('=== Tracks Request ===');
    log.info('Headers:', req.headers);
    await trackController.getTrack(req, res);
}));

// All other endpoints (no auth required now)
// router.use(authMiddleware);

// Package Search and List Endpoints
router.post('/packages', asyncHandler(SearchController.listPackages));
router.post('/package/byRegEx', asyncHandler(SearchController.searchByRegEx));
router.get('/package/byName/:name', asyncHandler(SearchController.getPackageByName));

// Package Retrieval Endpoints
router.get('/package/:id', asyncHandler(downloadController.getPackageById));
router.get('/package/:id/download', asyncHandler(downloadController.getPackageById));

// Package Update Endpoint
router.put('/package/:id', asyncHandler(updateController.updatePackage));

// Package Rating Endpoints
router.get('/package/:id/rate', asyncHandler(ratingController.ratePackage));

// Package Cost Endpoint
router.get('/package/:id/cost', asyncHandler(costController.getPackageCost));

// Package Upload Endpoint
router.post('/package', asyncHandler(uploadController.createPackage));

// Registry Reset Endpoint
router.delete('/reset', asyncHandler(resetController.resetRegistry));

export default router;