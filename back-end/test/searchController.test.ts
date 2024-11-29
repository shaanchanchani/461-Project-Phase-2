import { Request, Response } from 'express';
import { SearchController } from '../src/controllers/searchController';
import { SearchService } from '../src/services/searchService';

jest.mock('../src/services/searchService');
jest.mock('../src/logger');

describe('SearchController', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockReq = {
            query: {},
            body: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('listPackages', () => {
        it('should list packages successfully with offset', async () => {
            mockReq.query = { offset: '10' };
            const mockPackages = [
                { id: '1', name: 'package1' },
                { id: '2', name: 'package2' }
            ];
            
            (SearchService.listPackages as jest.Mock).mockResolvedValue(mockPackages);

            await SearchController.listPackages(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockPackages);
            expect(SearchService.listPackages).toHaveBeenCalledWith('10');
        });

        it('should list packages successfully without offset', async () => {
            const mockPackages = [
                { id: '1', name: 'package1' },
                { id: '2', name: 'package2' }
            ];
            
            (SearchService.listPackages as jest.Mock).mockResolvedValue(mockPackages);

            await SearchController.listPackages(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockPackages);
            expect(SearchService.listPackages).toHaveBeenCalledWith(undefined);
        });

        it('should handle listing packages error', async () => {
            (SearchService.listPackages as jest.Mock).mockRejectedValue(new Error('Listing failed'));

            await SearchController.listPackages(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to list packages' });
        });
    });

    describe('searchByRegEx', () => {
        it('should search packages by regex successfully', async () => {
            mockReq.body = { RegEx: '^test.*' };
            const mockPackages = [
                { id: '1', name: 'test-package1' },
                { id: '2', name: 'test-package2' }
            ];
            
            (SearchService.searchByRegEx as jest.Mock).mockResolvedValue(mockPackages);

            await SearchController.searchByRegEx(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockPackages);
            expect(SearchService.searchByRegEx).toHaveBeenCalledWith('^test.*');
        });

        it('should handle regex search error', async () => {
            mockReq.body = { RegEx: '^test.*' };
            
            (SearchService.searchByRegEx as jest.Mock).mockRejectedValue(new Error('Search failed'));

            await SearchController.searchByRegEx(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Failed to search packages' });
        });
    });
});
