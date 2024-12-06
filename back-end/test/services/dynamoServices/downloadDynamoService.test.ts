import { DownloadDynamoService } from '../../../src/services/dynamoServices';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { DownloadTableItem } from '../../../src/types';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('DownloadDynamoService', () => {
    let service: DownloadDynamoService;
    const mockSend = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        service = new DownloadDynamoService();
        (service as any).docClient = { send: mockSend };
    });

    describe('recordDownload', () => {
        const mockDownload: DownloadTableItem = {
            download_id: 'dl123',
            package_id: 'pkg123',
            user_id: 'user123',
            version: '1.0.0',
            timestamp: new Date().toISOString()
        };

        it('should record download successfully', async () => {
            mockSend.mockResolvedValueOnce({});

            await service.recordDownload(mockDownload);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: expect.any(String),
                    Item: mockDownload
                })
            );
        });
    });

    describe('getDownloadsByPackageId', () => {
        const mockDownloads: DownloadTableItem[] = [
            {
                download_id: 'dl123',
                package_id: 'pkg123',
                user_id: 'user123',
                version: '1.0.0',
                timestamp: new Date().toISOString()
            },
            {
                download_id: 'dl456',
                package_id: 'pkg123',
                user_id: 'user456',
                version: '1.0.0',
                timestamp: new Date().toISOString()
            }
        ];

        it('should return downloads when found', async () => {
            mockSend.mockResolvedValueOnce({ Items: mockDownloads });

            const result = await service.getDownloadsByPackageId('pkg123');
            expect(result).toEqual(mockDownloads);
            expect(mockSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    TableName: expect.any(String),
                    IndexName: 'package-id-index',
                    KeyConditionExpression: 'package_id = :pid'
                })
            );
        });

        it('should return empty array when no downloads found', async () => {
            mockSend.mockResolvedValueOnce({ Items: [] });

            const result = await service.getDownloadsByPackageId('pkg123');
            expect(result).toEqual([]);
        });
    });
});
