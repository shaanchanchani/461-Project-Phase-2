// src/config/aws.ts

import * as DynamoDB from 'aws-sdk/clients/dynamodb';
import { log } from '../logger';

export const TABLE_NAME = 'PackageRegistry';

/**
 * Configures and returns a DynamoDB DocumentClient
 * Automatically uses EC2 instance role credentials in production
 */
export function configureAWS() {
    return new DynamoDB.DocumentClient({
        region: 'us-east-1',  // Hardcoded since we know we're using us-east-1
        maxRetries: 3,
        httpOptions: {
            timeout: 5000,
            connectTimeout: 5000
        }
    });
}