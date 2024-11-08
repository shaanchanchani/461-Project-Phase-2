// src/routes.ts
import express, { Router } from 'express';
import { packageController } from './controllers/packageController';
import { RatingController } from './controllers/ratingController';
import { SearchController } from './controllers/searchController';
import { log } from './logger';

const router: Router = express.Router();

// Logging middleware
router.use((req, res, next) => {
    log.info(`${req.method} ${req.path}`);
    next();
});

// BASELINE Endpoints
router.post('/packages', SearchController.listPackages);
router.delete('/reset', packageController.resetRegistry);
router.post('/package/byRegEx', SearchController.searchByRegEx);
router.get('/package/:id/rate', RatingController.getRating);
router.get('/package/:id/cost', RatingController.getCost);
router.get('/package/:id', packageController.getPackage);
router.put('/package/:id', packageController.updatePackage);
router.post('/package', packageController.createPackage);

export default router;