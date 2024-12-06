// import { Response } from 'express';
// // import { PackageService } from '../services/packageService';
// import { RatingService } from '../services/ratingService';
// import { AuthenticatedRequest } from '../middleware/auth';
// import { log } from '../logger';

// export class PackageController {
//     // private packageService: PackageService;
//     private ratingService: RatingService;

//     constructor(
//         // packageService?: PackageService,
//         ratingService?: RatingService
//     ) {
//         this.packageService = packageService || new PackageService();
//         this.ratingService = ratingService || new RatingService();
//     }
    
//     public listPackages = async (req: AuthenticatedRequest, res: Response) => {
//         try {
//             const packages = await this.packageService.listPackages();
//             res.status(200).json(packages);
//         } catch (error) {
//             log.error('Error listing packages:', error);
//             res.status(500).json({ error: 'Failed to list packages' });
//         }
//     }

//     public listPackageVersions = async (req: AuthenticatedRequest, res: Response) => {
//         try {
//             const { packageId } = req.params;
//             const versions = await this.packageService.listPackageVersions(packageId);
//             res.status(200).json(versions);
//         } catch (error) {
//             log.error('Error listing package versions:', error);
//             res.status(500).json({ error: 'Failed to list package versions' });
//         }
//     }
// }

// // Initialize with default services
// export const packageController = new PackageController();