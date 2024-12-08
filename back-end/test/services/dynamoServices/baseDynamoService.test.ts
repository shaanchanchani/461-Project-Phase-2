import { BaseDynamoService } from '../../../src/services/dynamoServices';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('BaseDynamoService', () => {
    let service: BaseDynamoService;

    beforeEach(() => {
        jest.clearAllMocks();
        (DynamoDBClient as jest.Mock).mockImplementation(() => ({
            send: jest.fn()
        }));
        (DynamoDBDocumentClient.from as jest.Mock).mockImplementation(() => ({
            send: jest.fn()
        }));
        service = new BaseDynamoService();
    });

    describe('constructor', () => {
        it('should initialize with correct configuration', () => {
            expect(DynamoDBClient).toHaveBeenCalledWith({
                region: 'local',
                endpoint: 'http://localhost:8000',
                credentials: {
                    accessKeyId: 'local',
                    secretAccessKey: 'local'
                }
            });
            expect(DynamoDBDocumentClient.from).toHaveBeenCalled();
        });
    });

    // Add more tests for base functionality
});
