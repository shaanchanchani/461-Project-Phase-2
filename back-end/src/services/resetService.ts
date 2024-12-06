// src/services/resetService.ts
import { packageDynamoService, userDynamoService, metricsDynamoService, downloadDynamoService } from './dynamoServices';
import { S3Service } from './s3Service';
import { log } from '../logger';

const PACKAGES_TABLE = process.env.DYNAMODB_PACKAGES_TABLE || 'Packages';
const PACKAGE_VERSIONS_TABLE = process.env.DYNAMODB_PACKAGE_VERSIONS_TABLE || 'PackageVersions';
const PACKAGE_METRICS_TABLE = process.env.DYNAMODB_PACKAGE_METRICS_TABLE || 'PackageMetrics';
const DOWNLOADS_TABLE = process.env.DYNAMODB_DOWNLOADS_TABLE || 'Downloads';

// Default admin user configuration as specified in the documentation
const DEFAULT_ADMIN_USER = {
    name: 'ece30861defaultadminuser',
    isAdmin: true,
    password: 'correcthorsebatterystaple123(!__+@**(A;DROP TABLE packages'
};

export class ResetService {
    private packageDb: any;
    private userDb: any;
    private metricsDb: any;
    private downloadDb: any;
    private s3: S3Service;

    constructor(db?: any, s3?: S3Service) {
        this.packageDb = db || packageDynamoService;
        this.userDb = userDynamoService;
        this.metricsDb = metricsDynamoService;
        this.downloadDb = downloadDynamoService;
        this.s3 = s3 || new S3Service();
    }

    /**
     * Reset the registry to its system default state
     * This includes:
     * 1. Clearing all packages from storage
     * 2. Resetting database tables
     * 3. Restoring default admin user configuration
     */
    public async resetRegistry(): Promise<void> {
        try {
            log.info('Starting registry reset process');

            // Step 1: Clear all package content from S3
            log.info('Clearing S3 storage...');
            await this.s3.clearBucket();

            // Step 2: Clear all DynamoDB tables
            log.info('Clearing DynamoDB tables...');
            await Promise.all([
                this.packageDb.clearAllTables(),
                this.userDb.clearAllTables(),
                this.metricsDb.clearAllTables(),
                this.downloadDb.clearAllTables()
            ]);

            // Step 3: Restore default admin user
            log.info('Restoring default admin user...');
            try {
                // First try to delete the existing admin user if it exists
                const existingAdmin = await this.userDb.getUserByUsername(DEFAULT_ADMIN_USER.name);
                if (existingAdmin) {
                    log.info('Existing admin user found, removing...');
                    await this.userDb.deleteUser(existingAdmin.user_id);
                }
                
                // Now create the admin user
                await this.userDb.createAdminUser(DEFAULT_ADMIN_USER.name, DEFAULT_ADMIN_USER.password);
            } catch (error) {
                log.error('Error handling admin user:', error);
                throw error;
            }

            log.info('Registry reset completed successfully');
        } catch (error) {
            log.error('Error during registry reset:', error);
            throw error;
        }
    }
}
// Initialize with default services
export const resetService = new ResetService();
