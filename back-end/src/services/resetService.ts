// src/services/resetService.ts
import { DynamoDBService, dynamoDBService } from './dynamoDBService';
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
    private db: DynamoDBService;
    private s3: S3Service;

    constructor(db?: DynamoDBService, s3?: S3Service) {
        this.db = db || dynamoDBService;
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
                this.db.clearTable(PACKAGES_TABLE),
                this.db.clearTable(PACKAGE_VERSIONS_TABLE),
                this.db.clearTable(PACKAGE_METRICS_TABLE),
                this.db.clearTable(DOWNLOADS_TABLE)
            ]);

            // Step 3: Restore default admin user
            log.info('Restoring default admin user...');
            await this.db.put(PACKAGES_TABLE, DEFAULT_ADMIN_USER);

            log.info('Registry reset completed successfully');
        } catch (error) {
            log.error('Error during registry reset:', error);
            throw error;
        }
    }
}

// Initialize with default services
export const resetService = new ResetService();
