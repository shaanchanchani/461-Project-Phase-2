import { MetricsDynamoService } from '../src/services/dynamoServices/metricsDynamoService';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { log } from '../src/logger';
import { PackageMetricsTableItem } from '../src/types';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: jest.fn().mockImplementation(() => ({
        send: jest.fn()
    }))
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: jest.fn().mockReturnValue({
            send: jest.fn()
        })
    },
    QueryCommand: jest.fn(),
    PutCommand: jest.fn()
}));

jest.mock('../src/logger');

describe('MetricsDynamoService', () => {
    let service: MetricsDynamoService;
    let mockSend: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new MetricsDynamoService();
        mockSend = (DynamoDBDocumentClient.from(new DynamoDBClient({})) as any).send;
    });

    describe('createMetricEntry', () => {
        const mockMetricEntry: PackageMetricsTableItem = {
            metric_id: 'metric123',
            version_id: 'version123',
            net_score: 0.85,
            bus_factor: 0.7,
            ramp_up: 0.9,
            responsive_maintainer: 0.95,
            license_score: 1.0,
            good_pinning_practice: 0.8,
            pull_request: 0.75,
            correctness: 0.8,
            bus_factor_latency: 100,
            ramp_up_latency: 150,
            responsive_maintainer_latency: 120,
            license_score_latency: 80,
            good_pinning_practice_latency: 90,
            pull_request_latency: 110,
            correctness_latency: 130,
            net_score_latency: 140
        };

        it('should successfully create a metric entry', async () => {
            mockSend.mockResolvedValueOnce({});

            await service.createMetricEntry(mockMetricEntry);

            expect(mockSend).toHaveBeenCalledWith(expect.any(PutCommand));
            expect(log.info).toHaveBeenCalledWith(
                `Created metric entry for version ${mockMetricEntry.version_id}`
            );
        });

        it('should handle errors when creating metric entry', async () => {
            const mockError = new Error('DynamoDB error');
            mockSend.mockRejectedValueOnce(mockError);

            await expect(service.createMetricEntry(mockMetricEntry))
                .rejects.toThrow(mockError);
            expect(log.error).toHaveBeenCalledWith(
                'Error creating metric entry:',
                mockError
            );
        });
    });

    describe('getMetricsByVersionId', () => {
        const mockVersionId = 'version123';
        const mockMetric: PackageMetricsTableItem = {
            metric_id: 'metric123',
            version_id: mockVersionId,
            net_score: 0.85,
            bus_factor: 0.7,
            ramp_up: 0.9,
            responsive_maintainer: 0.95,
            license_score: 1.0,
            good_pinning_practice: 0.8,
            pull_request: 0.75,
            correctness: 0.8,
            bus_factor_latency: 100,
            ramp_up_latency: 150,
            responsive_maintainer_latency: 120,
            license_score_latency: 80,
            good_pinning_practice_latency: 90,
            pull_request_latency: 110,
            correctness_latency: 130,
            net_score_latency: 140
        };

        it('should successfully get metrics by version ID', async () => {
            mockSend.mockResolvedValueOnce({ Items: [mockMetric] });

            const result = await service.getMetricsByVersionId(mockVersionId);

            expect(result).toEqual(mockMetric);
            expect(mockSend).toHaveBeenCalledWith(expect.any(QueryCommand));
            expect(QueryCommand).toHaveBeenCalledWith({
                TableName: expect.any(String),
                IndexName: 'version_id-index',
                KeyConditionExpression: 'version_id = :vid',
                ExpressionAttributeValues: {
                    ':vid': mockVersionId
                }
            });
        });

        it('should return null when no metrics found', async () => {
            mockSend.mockResolvedValueOnce({ Items: [] });

            const result = await service.getMetricsByVersionId(mockVersionId);

            expect(result).toBeNull();
        });

        it('should handle undefined Items in response', async () => {
            mockSend.mockResolvedValueOnce({ Items: undefined });

            const result = await service.getMetricsByVersionId(mockVersionId);

            expect(result).toBeNull();
        });

        it('should handle errors when getting metrics', async () => {
            const mockError = new Error('DynamoDB error');
            mockSend.mockRejectedValueOnce(mockError);

            await expect(service.getMetricsByVersionId(mockVersionId))
                .rejects.toThrow(mockError);
            expect(log.error).toHaveBeenCalledWith(
                'Error getting metrics by version ID:',
                mockError
            );
        });
    });

    describe('extractKeyFromItem', () => {
        const METRICS_TABLE = process.env.DYNAMODB_PACKAGE_METRICS_TABLE || 'PackageMetrics';

        it('should extract key from metrics item', () => {
            const mockItem = { metric_id: '123', other: 'field' };
            const result = (service as any).extractKeyFromItem(
                METRICS_TABLE,
                mockItem
            );
            expect(result).toEqual({ metric_id: '123' });
        });

        it('should throw error for unknown table', () => {
            const mockItem = { id: '123' };
            expect(() => 
                (service as any).extractKeyFromItem('UnknownTable', mockItem)
            ).toThrow('Unknown table: UnknownTable');
        });
    });
});
