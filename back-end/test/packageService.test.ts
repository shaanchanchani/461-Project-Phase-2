import { PackageService } from '../src/services/packageService';
import { dynamoDBService } from '../src/services/dynamoDBService';
import { GitHubNotFoundError } from '../src/apiProcess/gitApiProcess';
import * as netScoreModule from '../src/metrics/netScore';
import * as urlUtils from '../src/utils/urlUtils';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock DynamoDB service
jest.mock('../src/services/dynamoDBService', () => ({
    dynamoDBService: {
        createPackage: jest.fn().mockImplementation((pkg) => Promise.resolve(pkg)),
        updatePackageRating: jest.fn().mockImplementation(() => Promise.resolve())
    }
}));

// Mock GetNetScore function
jest.mock('../src/metrics/netScore', () => ({
    GetNetScore: jest.fn()
}));

// Mock URL utils
jest.mock('../src/utils/urlUtils', () => ({
    checkUrlType: jest.fn(),
    processUrl: jest.fn(),
    UrlType: {
        GitHub: "github",
        npm: "npm",
        Invalid: "invalid"
    }
}));

describe('PackageService', () => {
    let packageService: PackageService;

    beforeEach(() => {
        packageService = new PackageService();
        
        // Clear all mocks before each test
        jest.clearAllMocks();
        
        // Set default mock implementation for GetNetScore
        (netScoreModule.GetNetScore as jest.Mock).mockResolvedValue({
            BusFactor: 0.5,
            Correctness: 0.8,
            RampUp: 0.7,
            ResponsiveMaintainer: 0.9,
            License: 1.0,
            NetScore: 0.8,
            BusFactor_Latency: 0.1,
            Correctness_Latency: 0.2,
            RampUp_Latency: 0.1,
            ResponsiveMaintainer_Latency: 0.3,
            License_Latency: 0.1,
            NetScore_Latency: 0.2
        });

        // Set default mock for URL utils
        (urlUtils.checkUrlType as jest.Mock).mockReturnValue('github');
        (urlUtils.processUrl as jest.Mock).mockResolvedValue({ owner: 'testowner', repo: 'testrepo' });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('processPackageFromUrl', () => {
        it('should process a valid GitHub URL', async () => {
            const mockUrl = 'https://github.com/owner/repo';
            const mockPackage = { id: '123', name: 'test-package', url: mockUrl, metrics: {
                BusFactor: 0.5,
                Correctness: 0.8,
                RampUp: 0.7,
                ResponsiveMaintainer: 0.9,
                License: 1.0,
                NetScore: 0.8,
                BusFactor_Latency: 0.1,
                Correctness_Latency: 0.2,
                RampUp_Latency: 0.1,
                ResponsiveMaintainer_Latency: 0.3,
                License_Latency: 0.1,
                NetScore_Latency: 0.2
            } };

            const result = await packageService.processPackageFromUrl(mockUrl);

            expect(result).toEqual(mockPackage);
            
            // Verify DynamoDB interactions
            expect(dynamoDBService.createPackage).toHaveBeenCalled();
            expect(dynamoDBService.updatePackageRating).toHaveBeenCalled();
        });

        it('should handle invalid URLs', async () => {
            const mockUrl = 'invalid-url';

            await expect(packageService.processPackageFromUrl(mockUrl))
                .rejects
                .toThrow('Invalid URL format');
        });

        it('should handle GitHub API errors', async () => {
            const mockUrl = 'https://github.com/owner/repo';

            (urlUtils.processUrl as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

            await expect(packageService.processPackageFromUrl(mockUrl))
                .rejects
                .toThrow('API Error');
        });

        it('should handle npm URL processing', async () => {
            const mockUrl = 'https://www.npmjs.com/package/test-package';
            const mockPackage = { id: '123', name: 'test-package', url: mockUrl, metrics: {
                BusFactor: 0.5,
                Correctness: 0.8,
                RampUp: 0.7,
                ResponsiveMaintainer: 0.9,
                License: 1.0,
                NetScore: 0.8,
                BusFactor_Latency: 0.1,
                Correctness_Latency: 0.2,
                RampUp_Latency: 0.1,
                ResponsiveMaintainer_Latency: 0.3,
                License_Latency: 0.1,
                NetScore_Latency: 0.2
            } };

            (urlUtils.checkUrlType as jest.Mock).mockReturnValue('npm');

            const result = await packageService.processPackageFromUrl(mockUrl);

            expect(result).toEqual(mockPackage);
            
            // Verify DynamoDB interactions
            expect(dynamoDBService.createPackage).toHaveBeenCalled();
            expect(dynamoDBService.updatePackageRating).toHaveBeenCalled();
        });
    });
});