// src/routes.ts
import express from 'express';
import { PackageController } from './controllers/packageController';
import { RatingController } from './controllers/ratingController';
import { SearchController } from './controllers/searchController';
import { log } from './logger';

const router = express.Router();

// Logging middleware
router.use((req, res, next) => {
    log.info(`${req.method} ${req.path}`);
    next();
});

// BASELINE Endpoints
router.post('/packages', SearchController.listPackages);              // Get packages from registry
router.delete('/reset', PackageController.resetRegistry);             // Reset the registry
router.get('/package/:id', PackageController.getPackage);            // Get package by ID
router.put('/package/:id', PackageController.updatePackage);         // Update package
router.post('/package', PackageController.createPackage);            // Create new package
router.get('/package/:id/rate', RatingController.getRating);         // Get package rating
router.get('/package/:id/cost', RatingController.getCost);           // Get package cost
router.post('/package/byRegEx', SearchController.searchByRegEx);     // Search by regex

export default router;
