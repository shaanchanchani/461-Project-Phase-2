// // src/services/packageService.ts
// import { packageDynamoService } from './dynamoServices';
// import { log } from '../logger';
// import { PackageTableItem, PackageVersionTableItem } from '../types';

// export class PackageService {
//   constructor() {}

//   public async listPackages(): Promise<PackageTableItem[]> {
//     try {
//       return await packageDynamoService.listPackages();
//     } catch (error) {
//       log.error('Error listing packages:', error);
//       throw error;
//     }
//   }

//   public async listPackageVersions(packageId: string): Promise<PackageVersionTableItem[]> {
//     try {
//       return await packageDynamoService.listPackageVersions(packageId);
//     } catch (error) {
//       log.error('Error listing package versions:', error);
//       throw error;
//     }
//   }
// }