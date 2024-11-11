// src/config/aws.ts
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { NodeHttpHandlerOptions } from "@smithy/node-http-handler";

export const TABLE_NAME = process.env.DYNAMODB_TABLE || 'packages';

export function createDynamoDBClients() {
    // HTTP handler options for timeouts
    const handlerOptions: NodeHttpHandlerOptions = {
        connectionTimeout: 5000,
        socketTimeout: 5000
    };

    const config: DynamoDBClientConfig = {
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: process.env.AWS_ACCESS_KEY_ID ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
        } : undefined,
        maxAttempts: 3,
        requestHandler: {
            connectionTimeout: handlerOptions.connectionTimeout,
            socketTimeout: handlerOptions.socketTimeout
        }
    };

    const baseClient = new DynamoDBClient(config);
    const documentClient = DynamoDBDocumentClient.from(baseClient, {
        marshallOptions: {
            removeUndefinedValues: true,
        }
    });

    return { baseClient, documentClient };
}