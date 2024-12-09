import { SearchController } from '../src/controllers/searchController';
import { SearchService } from '../src/services/searchService';
import { regexService } from '../src/services/regexService';
import { Request, Response } from 'express';
import { log } from '../src/logger';

jest.mock('../src/services/searchService');
jest.mock('../src/services/regexService');
jest.mock('../src/logger');

describe('SearchController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockSet: jest.Mock;

    beforeEach(() => {
        mockJson = jest.fn();
        mockStatus = jest.fn().mockReturnValue({ json: mockJson });
        mockSet = jest.fn();
        mockResponse = {
            json: mockJson,
            status: mockStatus,
            set: mockSet
        };
        jest.clearAllMocks();
    });

    describe('listPackages', () => {
        it('should return 400 if request body is not an array', async () => {
            mockRequest = {
                query: {},
                body: { notAnArray: true }
            };

            await SearchController.listPackages(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Request body must be an array of PackageQuery objects'
            });
        });

        it('should return 400 if query object is missing Name field', async () => {
            mockRequest = {
                query: {},
                body: [{ Version: '1.0.0' }]
            };

            await SearchController.listPackages(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Each query must have a Name field of type string'
            });
        });

        it('should return 400 if Name field is not a string', async () => {
            mockRequest = {
                query: {},
                body: [{ Name: 123 }]
            };

            await SearchController.listPackages(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Each query must have a Name field of type string'
            });
        });

        it('should return 400 if Version field is not a string', async () => {
            mockRequest = {
                query: {},
                body: [{ Name: 'test', Version: 123 }]
            };

            await SearchController.listPackages(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({
                error: 'Version field must be a string'
            });
        });

        it('should return packages successfully with less than 10 results', async () => {
            const mockPackages = [{ name: 'test-package' }];
            (SearchService.searchPackages as jest.Mock).mockResolvedValue(mockPackages);

            mockRequest = {
                query: { offset: '0' },
                body: [{ Name: 'test' }]
            };

            await SearchController.listPackages(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(mockPackages);
            expect(mockSet).not.toHaveBeenCalled();
        });

        it('should set offset header when exactly 10 results are returned', async () => {
            const mockPackages = Array(10).fill({ name: 'test-package' });
            (SearchService.searchPackages as jest.Mock).mockResolvedValue(mockPackages);

            mockRequest = {
                query: { offset: '0' },
                body: [{ Name: 'test' }]
            };

            await SearchController.listPackages(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(mockPackages);
            expect(mockSet).toHaveBeenCalledWith('offset', '10');
        });

        it('should return 413 if too many results', async () => {
            const mockPackages = Array(101).fill({ name: 'test-package' });
            (SearchService.searchPackages as jest.Mock).mockResolvedValue(mockPackages);

            mockRequest = {
                query: { offset: '0' },
                body: [{ Name: 'test' }]
            };

            await SearchController.listPackages(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(413);
            expect(mockJson).toHaveBeenCalledWith({ error: 'Too many packages returned' });
        });

        it('should return 500 on service error', async () => {
            (SearchService.searchPackages as jest.Mock).mockRejectedValue(new Error('Service error'));

            mockRequest = {
                query: { offset: '0' },
                body: [{ Name: 'test' }]
            };

            await SearchController.listPackages(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to list packages' });
            expect(log.error).toHaveBeenCalledWith('Error listing packages:', expect.any(Error));
        });
    });

    describe('searchByRegEx', () => {
        it('should return packages successfully', async () => {
            const mockPackages = [{ name: 'test-package' }];
            (regexService.searchByRegEx as jest.Mock).mockResolvedValue(mockPackages);

            mockRequest = {
                body: { RegEx: 'test.*' }
            };

            await SearchController.searchByRegEx(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(mockPackages);
        });

        it('should return 500 on service error', async () => {
            (regexService.searchByRegEx as jest.Mock).mockRejectedValue(new Error('Service error'));

            mockRequest = {
                body: { RegEx: 'test.*' }
            };

            await SearchController.searchByRegEx(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to search packages' });
            expect(log.error).toHaveBeenCalledWith('Error searching packages:', expect.any(Error));
        });
    });

    describe('getPackageById', () => {
        it('should return 400 if package ID is missing', async () => {
            mockRequest = {
                params: {}
            };

            await SearchController.getPackageById(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid package ID' });
        });

        it('should return 400 if package ID is not a string', async () => {
            mockRequest = {
                params: { id: 123 as any }
            };

            await SearchController.getPackageById(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(400);
            expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid package ID' });
        });

        it('should return 404 if package is not found', async () => {
            (SearchService.getPackageById as jest.Mock).mockResolvedValue(null);

            mockRequest = {
                params: { id: 'test-id' }
            };

            await SearchController.getPackageById(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(404);
            expect(mockJson).toHaveBeenCalledWith({ error: 'Package not found' });
        });

        it('should return package successfully', async () => {
            const mockPackage = { name: 'test-package' };
            (SearchService.getPackageById as jest.Mock).mockResolvedValue(mockPackage);

            mockRequest = {
                params: { id: 'test-id' }
            };

            await SearchController.getPackageById(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(200);
            expect(mockJson).toHaveBeenCalledWith(mockPackage);
        });

        it('should return 500 on service error', async () => {
            (SearchService.getPackageById as jest.Mock).mockRejectedValue(new Error('Service error'));

            mockRequest = {
                params: { id: 'test-id' }
            };

            await SearchController.getPackageById(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockStatus).toHaveBeenCalledWith(500);
            expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to get package' });
            expect(log.error).toHaveBeenCalledWith('Error getting package by ID:', expect.any(Error));
        });
    });
});
