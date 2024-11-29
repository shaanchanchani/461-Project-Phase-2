// src/scripts/setup-local.ts
import { DynamoDBService } from '../services/dynamoDBService';
import dotenv from 'dotenv';

dotenv.config();

async function setupLocalDev() {
    // Set environment variables for local development
    process.env.USE_LOCAL_DYNAMODB = 'true';
    process.env.AWS_REGION = 'local';
    process.env.NODE_ENV = 'development';
    
    try {
        console.log('🚀 Setting up local development environment...');
        
        // Initialize DynamoDB service
        const dynamoDBService = new DynamoDBService();
        
        // Create tables
        console.log('📦 Creating DynamoDB tables...');
        await dynamoDBService.createTable();
        
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