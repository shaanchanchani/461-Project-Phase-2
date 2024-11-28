import { DynamoDBService } from '../src/services/dynamoDBService';
import { Package } from '../src/types';
import { ScalarAttributeType, KeyType, BillingMode } from "@aws-sdk/client-dynamodb";

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-dynamodb', () => {
    const actual = jest.requireActual('@aws-sdk/client-dynamodb');
    return {
        ...actual,
        DynamoDBClient: jest.fn().mockImplementation(() => ({
            send: jest.fn()
        })),
        CreateTableCommand: jest.fn().mockImplementation((input) => ({
            input
        })),
        ListTablesCommand: jest.fn().mockImplementation((input) => ({
            input
        })),
        DescribeTableCommand: jest.fn().mockImplementation((input) => ({
            input
        }))
    };
});

jest.mock('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: jest.fn().mockImplementation(() => ({
            send: jest.fn()
        }))
    },
    PutCommand: jest.fn().mockImplementation((input) => ({
        input
    })),
    QueryCommand: jest.fn().mockImplementation((input) => ({
        input
    })),
    GetCommand: jest.fn().mockImplementation((input) => ({
        input
    }))
}));

describe('DynamoDBService', () => {
    let service: DynamoDBService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new DynamoDBService();
    });

    describe('Table Operations', () => {
        test('listTables should return array of table names', async () => {
            const mockTables = ['table1', 'table2'];
            const mockSend = jest.fn().mockResolvedValue({ TableNames: mockTables });
            service['baseClient'].send = mockSend;

            const result = await service.listTables();
            expect(result).toEqual(mockTables);
            expect(mockSend).toHaveBeenCalled();
        });

        test('tableExists should return true when table exists', async () => {
            const mockSend = jest.fn().mockResolvedValue({ Table: { TableName: 'packages' } });
            service['baseClient'].send = mockSend;

            const result = await service.tableExists('packages');
            expect(result).toBe(true);
            expect(mockSend).toHaveBeenCalled();
        });

        test('tableExists should return false when table does not exist', async () => {
            const mockSend = jest.fn().mockRejectedValue({ name: 'ResourceNotFoundException' });
            service['baseClient'].send = mockSend;

            const result = await service.tableExists('non-existent-table');
            expect(result).toBe(false);
            expect(mockSend).toHaveBeenCalled();
        });

        test('createTable should create table if it does not exist', async () => {
            const mockSend = jest.fn()
                .mockRejectedValueOnce({ name: 'ResourceNotFoundException' }) // For tableExists check
                .mockResolvedValueOnce({}) // For createTable
                .mockResolvedValueOnce({ Table: { TableStatus: 'ACTIVE' } }); // For describe table status
            service['baseClient'].send = mockSend;

            await service.createTable();
            expect(mockSend).toHaveBeenCalledTimes(3);
        });
    });

    describe('Package Operations', () => {
        const mockPackage: Package = {
            metadata: {
                Name: 'test-package',
                Version: '1.0.0',
                ID: '123456789abcdef'
            },
            data: {
                Content: 'base64content',
                URL: 'https://example.com/package'
            }
        };

        test('createPackage should store package correctly', async () => {
            const mockSend = jest.fn().mockResolvedValue({});
            service['docClient'].send = mockSend;

            await service.createPackage(mockPackage);
            
            expect(mockSend).toHaveBeenCalled();
            const putCommand = mockSend.mock.calls[0][0];
            expect(putCommand.input.TableName).toBe('packages');
            expect(putCommand.input.Item.type).toBe('package');
            expect(putCommand.input.Item.metadata).toEqual(mockPackage.metadata);
        });

        test('createPackage should handle duplicate package error', async () => {
            const mockError = new Error('The conditional request failed');
            mockError.name = 'ConditionalCheckFailedException';
            const mockSend = jest.fn().mockRejectedValue(mockError);
            service['docClient'].send = mockSend;

            await expect(async () => {
                await service.createPackage(mockPackage);
            }).rejects.toThrow(`Package ${mockPackage.metadata.Name} v${mockPackage.metadata.Version} already exists`);
        });

        test('getPackage should retrieve package by ID', async () => {
            const mockDynamoPackage = {
                PK: `PKG#${mockPackage.metadata.ID}`,
                SK: 'METADATA#latest',
                type: 'package',
                metadata: mockPackage.metadata,
                data: mockPackage.data,
                createdAt: new Date().toISOString()
            };

            const mockSend = jest.fn().mockResolvedValue({ Items: [mockDynamoPackage] });
            service['docClient'].send = mockSend;

            const result = await service.getPackage(mockPackage.metadata.ID);
            expect(result).toBeDefined();
            expect(result?.metadata).toEqual(mockPackage.metadata);
            expect(mockSend).toHaveBeenCalled();
        });

        test('getPackage should return null for non-existent package', async () => {
            const mockSend = jest.fn().mockResolvedValue({ Items: [] });
            service['docClient'].send = mockSend;

            const result = await service.getPackage('non-existent-id');
            expect(result).toBeNull();
            expect(mockSend).toHaveBeenCalled();
        });

        test('updatePackageRating should update rating correctly', async () => {
            const mockRating = {
                BusFactor: 0.5,
                Correctness: 0.8,
                RampUp: 0.7,
                ResponsiveMaintainer: 0.9,
                LicenseScore: 1.0,
                GoodPinningPractice: 0.6,
                PullRequest: 0.8,
                NetScore: 0.75,
                BusFactorLatency: 100,
                CorrectnessLatency: 200,
                RampUpLatency: 150,
                ResponsiveMaintainerLatency: 300,
                LicenseScoreLatency: 50,
                GoodPinningPracticeLatency: 250,
                PullRequestLatency: 180,
                NetScoreLatency: 200
            };

            const mockSend = jest.fn().mockResolvedValue({});
            service['docClient'].send = mockSend;

            await service.updatePackageRating(mockPackage.metadata.ID, mockRating);
            
            expect(mockSend).toHaveBeenCalled();
            const putCommand = mockSend.mock.calls[0][0];
            expect(putCommand.input.TableName).toBe('packages');
            expect(putCommand.input.Item.type).toBe('rating');
            expect(putCommand.input.Item.rating).toEqual(mockRating);
        });
    });

    describe('Error Handling', () => {
        test('should handle DynamoDB client errors', async () => {
            const mockError = new Error('DynamoDB Error');
            const mockSend = jest.fn().mockRejectedValue(mockError);
            service['baseClient'].send = mockSend;

            await expect(service.listTables()).rejects.toThrow('DynamoDB Error');
            expect(mockSend).toHaveBeenCalled();
        });
    });
});