import { DownloadDynamoService } from '../src/services/dynamoServices/downloadDynamoService';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { log } from '../src/logger';

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

describe('DownloadDynamoService', () => {
    let service: DownloadDynamoService;
    let mockSend: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new DownloadDynamoService();
        mockSend = (DynamoDBDocumentClient.from(new DynamoDBClient({})) as any).send;
    });

    describe('recordDownload', () => {
        const mockDownload = {
            download_id: '123',
            package_id: 'pkg123',
            user_id: 'user123',
            version: '1.0.0',
            timestamp: new Date().toISOString()
        };

        it('should successfully record a download', async () => {
            mockSend.mockResolvedValueOnce({});

            await service.recordDownload(mockDownload);

            expect(mockSend).toHaveBeenCalledWith(expect.any(PutCommand));
            expect(log.info).toHaveBeenCalledWith(
                `Successfully recorded download for package ${mockDownload.package_id}`
            );
        });

        it('should handle errors when recording download', async () => {
            const mockError = new Error('DynamoDB error');
            mockSend.mockRejectedValueOnce(mockError);

            await expect(service.recordDownload(mockDownload)).rejects.toThrow(mockError);
            expect(log.error).toHaveBeenCalledWith('Error recording download:', mockError);
        });
    });

    describe('getDownloadsByPackageId', () => {
        const mockPackageId = 'pkg123';
        const mockDownloads = [
            {
                download_id: '123',
                package_id: mockPackageId,
                user_id: 'user123',
                version: '1.0.0',
                timestamp: new Date().toISOString()
            },
            {
                download_id: '456',
                package_id: mockPackageId,
                user_id: 'user456',
                version: '1.0.0',
                timestamp: new Date().toISOString()
            }
        ];

        it('should successfully get downloads by package ID', async () => {
            mockSend.mockResolvedValueOnce({ Items: mockDownloads });

            const result = await service.getDownloadsByPackageId(mockPackageId);

            expect(result).toEqual(mockDownloads);
            expect(mockSend).toHaveBeenCalledWith(expect.any(QueryCommand));
            expect(QueryCommand).toHaveBeenCalledWith({
                TableName: expect.any(String),
                IndexName: 'package-id-index',
                KeyConditionExpression: 'package_id = :pid',
                ExpressionAttributeValues: {
                    ':pid': mockPackageId
                }
            });
        });

        it('should return empty array when no downloads found', async () => {
            mockSend.mockResolvedValueOnce({ Items: undefined });

            const result = await service.getDownloadsByPackageId(mockPackageId);

            expect(result).toEqual([]);
        });

        it('should handle errors when getting downloads', async () => {
            const mockError = new Error('DynamoDB error');
            mockSend.mockRejectedValueOnce(mockError);

            await expect(service.getDownloadsByPackageId(mockPackageId))
                .rejects.toThrow(mockError);
            expect(log.error).toHaveBeenCalledWith(
                'Error getting downloads by package ID:',
                mockError
            );
        });
    });

    describe('extractKeyFromItem', () => {
        it('should extract key from download item', () => {
            const mockItem = { download_id: '123', other: 'field' };
            const result = (service as any).extractKeyFromItem(
                process.env.DYNAMODB_DOWNLOADS_TABLE || 'Downloads',
                mockItem
            );
            expect(result).toEqual({ download_id: '123' });
        });

        it('should throw error for unknown table', () => {
            const mockItem = { id: '123' };
            expect(() => 
                (service as any).extractKeyFromItem('UnknownTable', mockItem)
            ).toThrow('Unknown table: UnknownTable');
        });
    });
});
