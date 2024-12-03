import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

const PACKAGES_TABLE = process.env.DYNAMODB_PACKAGES_TABLE || 'Packages';
const PACKAGE_VERSIONS_TABLE = process.env.DYNAMODB_PACKAGE_VERSIONS_TABLE || 'PackageVersions';
const PACKAGE_METRICS_TABLE = process.env.DYNAMODB_PACKAGE_METRICS_TABLE || 'PackageMetrics';

const dynamodb = new DynamoDB({
    endpoint: 'http://localhost:8000',
    region: 'local',
    credentials: {
        accessKeyId: 'local',
        secretAccessKey: 'local'
    }
});

async function createPackagesTable() {
    try {
        await dynamodb.createTable({
            TableName: PACKAGES_TABLE,
            AttributeDefinitions: [
                { AttributeName: 'name', AttributeType: 'S' },
                { AttributeName: 'package_id', AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'name', KeyType: 'HASH' }
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'package_id-index',
                    KeySchema: [
                        { AttributeName: 'package_id', KeyType: 'HASH' }
                    ],
                    Projection: {
                        ProjectionType: 'ALL'
                    },
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 5,
                        WriteCapacityUnits: 5
                    }
                }
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
            }
        });
        console.log('✅ Packages table created');
    } catch (error: any) {
        if (error.name === 'ResourceInUseException') {
            console.log('ℹ️  Packages table already exists');
        } else {
            throw error;
        }
    }
}

async function createVersionsTable() {
    try {
        await dynamodb.createTable({
            TableName: PACKAGE_VERSIONS_TABLE,
            AttributeDefinitions: [
                { AttributeName: 'package_id', AttributeType: 'S' },
                { AttributeName: 'version', AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'package_id', KeyType: 'HASH' },
                { AttributeName: 'version', KeyType: 'RANGE' }
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
            }
        });
        console.log('✅ Versions table created');
    } catch (error: any) {
        if (error.name === 'ResourceInUseException') {
            console.log('ℹ️  Versions table already exists');
        } else {
            throw error;
        }
    }
}

async function createMetricsTable() {
    try {
        await dynamodb.createTable({
            TableName: PACKAGE_METRICS_TABLE,
            AttributeDefinitions: [
                { AttributeName: 'metric_id', AttributeType: 'S' },
                { AttributeName: 'version_id', AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'metric_id', KeyType: 'HASH' },
                { AttributeName: 'version_id', KeyType: 'RANGE' }
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5
            }
        });
        console.log('✅ Metrics table created');
    } catch (error: any) {
        if (error.name === 'ResourceInUseException') {
            console.log('ℹ️  Metrics table already exists');
        } else {
            throw error;
        }
    }
}

async function waitForDynamoDB() {
    console.log('⏳ Waiting for DynamoDB to be ready...');
    let retries = 0;
    const maxRetries = 10;
    
    while (retries < maxRetries) {
        try {
            await dynamodb.listTables({});
            console.log('✅ DynamoDB is ready');
            return;
        } catch (error) {
            retries++;
            if (retries === maxRetries) {
                throw new Error('DynamoDB failed to start');
            }
            console.log(`Waiting for DynamoDB... (attempt ${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

async function setupLocalDev() {
    // Set environment variables for local development
    process.env.USE_LOCAL_DYNAMODB = 'true';
    process.env.AWS_REGION = 'local';
    process.env.NODE_ENV = 'development';
    
    try {
        console.log('🚀 Setting up local development environment...');
        
        // Start Docker containers
        console.log('📦 Starting Docker containers...');
        await execAsync('docker-compose up -d');
        
        // Wait for DynamoDB to be ready
        await waitForDynamoDB();
        
        // Create tables
        console.log('📝 Creating DynamoDB tables...');
        await createPackagesTable();
        await createVersionsTable();
        await createMetricsTable();
        
        console.log('✨ Local development environment setup complete!');
        console.log('\nYou can now:');
        console.log('1. Access DynamoDB locally at http://localhost:8000');
        console.log('2. Use DynamoDB Admin UI at http://localhost:8001');
        console.log('3. Run your application with npm start\n');
        
    } catch (error) {
        console.error('❌ Error setting up local development environment:', error);
        process.exit(1);
    }
}

// Run setup if this script is executed directly
if (require.main === module) {
    setupLocalDev();
}

export { setupLocalDev };