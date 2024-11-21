// src/config/aws.ts
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { NodeHttpHandlerOptions } from "@smithy/node-http-handler";
import { fromIni } from "@aws-sdk/credential-providers";
import { localConfig } from './local';
import dotenv from 'dotenv';

dotenv.config();

export const TABLE_NAME = process.env.DYNAMODB_TABLE || 'packages';
const isDevelopment = process.env.NODE_ENV === 'development';

export function createDynamoDBClients() {
    const handlerOptions: NodeHttpHandlerOptions = {
        connectionTimeout: 5000,
        socketTimeout: 5000
    };

    // Use local DynamoDB if explicitly set, otherwise use AWS credentials
    const config: DynamoDBClientConfig = process.env.USE_LOCAL_DYNAMODB === 'true'
        ? {
            ...localConfig.aws,
            requestHandler: {
                connectionTimeout: handlerOptions.connectionTimeout,
                socketTimeout: handlerOptions.socketTimeout
            }
        }
        : {
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: process.env.AWS_PROFILE 
                ? fromIni({ profile: process.env.AWS_PROFILE })
                : undefined,
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