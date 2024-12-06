import { MetricsDynamoService } from '../../../src/services/dynamoServices';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { PackageMetricsTableItem } from '../../../src/types';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('MetricsDynamoService', () => {
    let service: MetricsDynamoService;
    const mockSend = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        service = new MetricsDynamoService();
        (service as any).docClient = { send: mockSend };
    });

    describe('createMetricEntry', () => {
        const mockMetric: PackageMetricsTableItem = {
            metric_id: 'metric123',
            version_id: 'version123',
            net_score: 0.85,
            net_score_latency: 105, 
            bus_factor: 0.8,
            ramp_up: 0.7,
            responsive_maintainer: 0.85,
            license_score: 1.0,
            good_pinning_practice: 0.9,
            pull_request: 0.95,
            correctness: 0.9,
            bus_factor_latency: 100,
            ramp_up_latency: 150,
            responsive_maintainer_latency: 120,
            license_score_latency: 80,
            good_pinning_practice_latency: 90,
            pull_request_latency: 110,
            correctness_latency: 130
        };

        it('should create metric entry successfully', async () => {
            mockSend.mockResolvedValueOnce({});

            await service.createMetricEntry(mockMetric);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: expect.any(String),
                    Item: mockMetric
                })
            );
        });
    });

    describe('getMetricsByVersionId', () => {
        const mockMetric: PackageMetricsTableItem = {
            metric_id: 'metric123',
            version_id: 'version123',
            net_score: 0.85,
            net_score_latency: 105, 
            bus_factor: 0.8,
            ramp_up: 0.7,
            responsive_maintainer: 0.85,
            license_score: 1.0,
            good_pinning_practice: 0.9,
            pull_request: 0.95,
            correctness: 0.9,
            bus_factor_latency: 100,
            ramp_up_latency: 150,
            responsive_maintainer_latency: 120,
            license_score_latency: 80,
            good_pinning_practice_latency: 90,
            pull_request_latency: 110,
            correctness_latency: 130
        };

        it('should return metrics when found', async () => {
            mockSend.mockResolvedValueOnce({ Items: [mockMetric] });

            const result = await service.getMetricsByVersionId('version123');
            expect(result).toEqual(mockMetric);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: expect.any(String),
                    KeyConditionExpression: 'version_id = :vid'
                })
            );
        });

        it('should return null when metrics not found', async () => {
            mockSend.mockResolvedValueOnce({ Items: [] });

            const result = await service.getMetricsByVersionId('version123');
            expect(result).toBeNull();
        });
    });
});
