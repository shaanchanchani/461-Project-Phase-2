import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

const USERS_TABLE = 'Users';
const USER_GROUPS_TABLE ='UserGroups';
const PACKAGES_TABLE = 'Packages';
const PACKAGE_VERSIONS_TABLE ='PackageVersions';
const PACKAGE_METRICS_TABLE ='PackageMetrics';
const DOWNLOADS_TABLE ='Downloads';

const dynamodb = new DynamoDB({
    endpoint: 'http://localhost:8000',
    region: 'local',
    credentials: {
        accessKeyId: 'local',
        secretAccessKey: 'local'
    }
});
async function createUsersTable() {
    try {
        await dynamodb.createTable({
            TableName: USERS_TABLE,
            AttributeDefinitions: [
                { AttributeName: 'user_id', AttributeType: 'S' },
                { AttributeName: 'username', AttributeType: 'S' },
                { AttributeName: 'group_id', AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'user_id', KeyType: 'HASH' }
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'username-index',
                    KeySchema: [
                        { AttributeName: 'username', KeyType: 'HASH' }
                    ],
                    Projection: {
                        ProjectionType: 'ALL'
                    },
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 5,
                        WriteCapacityUnits: 5
                    }
                },
                {
                    IndexName: 'group-id-index',
                    KeySchema: [
                        { AttributeName: 'group_id', KeyType: 'HASH' }
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
        console.log('✅ Users table created');
    } catch (error: any) {
        if (error.name === 'ResourceInUseException') {
            console.log('ℹ️  Users table already exists');
        } else {
            throw error;
        }
    }
}

async function createUserGroupsTable() {
    try {
        await dynamodb.createTable({
            TableName: USER_GROUPS_TABLE,
            AttributeDefinitions: [
                { AttributeName: 'group_id', AttributeType: 'S' },
                { AttributeName: 'group_name', AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'group_id', KeyType: 'HASH' }
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'group-name-index',
                    KeySchema: [
                        { AttributeName: 'group_name', KeyType: 'HASH' }
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
        console.log('✅ User Groups table created');
    } catch (error: any) {
        if (error.name === 'ResourceInUseException') {
            console.log('ℹ️  User Groups table already exists');
        } else {
            throw error;
        }
    }
}
async function createPackagesTable() {
    try {
        await dynamodb.createTable({
            TableName: PACKAGES_TABLE,
            AttributeDefinitions: [
                { AttributeName: 'name', AttributeType: 'S' },
                { AttributeName: 'package_id', AttributeType: 'S' },
                { AttributeName: 'user_id', AttributeType: 'S' }
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
                },
                {
                    IndexName: 'user_id-index',
                    KeySchema: [
                        { AttributeName: 'user_id', KeyType: 'HASH' }
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
                { AttributeName: 'version', AttributeType: 'S' },
                { AttributeName: 'name', AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'package_id', KeyType: 'HASH' },
                { AttributeName: 'version', KeyType: 'RANGE' }
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'name-index',
                    KeySchema: [
                        { AttributeName: 'name', KeyType: 'HASH' }
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
                { AttributeName: 'metric_id', KeyType: 'HASH' }
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'version_id-index',
                    KeySchema: [
                        { AttributeName: 'version_id', KeyType: 'HASH' }
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
        console.log('✅ Metrics table created');
    } catch (error: any) {
        if (error.name === 'ResourceInUseException') {
            console.log('ℹ️  Metrics table already exists');
        } else {
            throw error;
        }
    }
}

async function createDownloadsTable() {
    try {
        await dynamodb.createTable({
            TableName: DOWNLOADS_TABLE,
            AttributeDefinitions: [
                { AttributeName: 'download_id', AttributeType: 'S' },
                { AttributeName: 'user_id', AttributeType: 'S' },
                { AttributeName: 'package_id', AttributeType: 'S' },
                { AttributeName: 'timestamp', AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'download_id', KeyType: 'HASH' }
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: 'UserDownloadsIndex',
                    KeySchema: [
                        { AttributeName: 'user_id', KeyType: 'HASH' },
                        { AttributeName: 'timestamp', KeyType: 'RANGE' }
                    ],
                    Projection: {
                        ProjectionType: 'ALL'
                    },
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 5,
                        WriteCapacityUnits: 5
                    }
                },
                {
                    IndexName: 'PackageDownloadsIndex',
                    KeySchema: [
                        { AttributeName: 'package_id', KeyType: 'HASH' },
                        { AttributeName: 'timestamp', KeyType: 'RANGE' }
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
        console.log('✅ Downloads table created');
    } catch (error: any) {
        if (error.name === 'ResourceInUseException') {
            console.log('ℹ️  Downloads table already exists');
        } else {
            throw error;
        }
    }
}

async function deleteTable(tableName: string) {
    try {
        await dynamodb.deleteTable({ TableName: tableName });
        console.log(`🗑️  Deleted table ${tableName}`);
        // Wait a bit for the table to be fully deleted
        await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
        if (error.name === 'ResourceNotFoundException') {
            console.log(`ℹ️  Table ${tableName} does not exist`);
        } else {
            console.error(`❌ Error deleting table ${tableName}:`, error);
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
    try {
        await waitForDynamoDB();
        
        // First delete all existing tables
        console.log('🗑️  Cleaning up existing tables...');
        await Promise.all([
            deleteTable(USERS_TABLE),
            deleteTable(USER_GROUPS_TABLE),
            deleteTable(PACKAGES_TABLE),
            deleteTable(PACKAGE_VERSIONS_TABLE),
            deleteTable(PACKAGE_METRICS_TABLE),
            deleteTable(DOWNLOADS_TABLE)
        ]);

        // Wait a bit for tables to be fully deleted
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🏗️  Creating tables...');
        await Promise.all([
            createUsersTable(),
            createUserGroupsTable(),
            createPackagesTable(),
            createVersionsTable(),
            createMetricsTable(),
            createDownloadsTable()
        ]);
        
        console.log('✨ Local development setup complete!');
    } catch (error) {
        console.error('❌ Error during setup:', error);
        process.exit(1);
    }
}

// Run setup if this script is executed directly
if (require.main === module) {
    setupLocalDev();
}

export { setupLocalDev };
