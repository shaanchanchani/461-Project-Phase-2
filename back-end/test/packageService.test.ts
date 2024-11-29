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
    beforeEach(() => {
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

    it('should process package from GitHub URL', async () => {
        const url = 'https://github.com/lodash/lodash';
        const result = await PackageService.processPackageFromUrl(url);
        
        expect(result).toBeDefined();
        expect(result.url).toBe(url);
        expect(result.metrics).toBeDefined();
        
        // Verify DynamoDB interactions
        expect(dynamoDBService.createPackage).toHaveBeenCalled();
        expect(dynamoDBService.updatePackageRating).toHaveBeenCalled();
    });

    it('should process package from npm URL', async () => {
        const url = 'https://www.npmjs.com/package/express';
        (urlUtils.checkUrlType as jest.Mock).mockReturnValue('npm');
        
        const result = await PackageService.processPackageFromUrl(url);
        
        expect(result).toBeDefined();
        expect(result.url).toBe(url);
        expect(result.metrics).toBeDefined();
        
        // Verify DynamoDB interactions
        expect(dynamoDBService.createPackage).toHaveBeenCalled();
        expect(dynamoDBService.updatePackageRating).toHaveBeenCalled();
    });

    it('should handle invalid URLs', async () => {
        const invalidUrl = 'https://github.com/invalid/repo';
        (urlUtils.processUrl as jest.Mock).mockRejectedValueOnce(new GitHubNotFoundError('Not Found. Invalid URL.'));
        
        await expect(PackageService.processPackageFromUrl(invalidUrl))
            .rejects
            .toThrow(GitHubNotFoundError);
    });

    it('should handle missing metrics', async () => {
        const url = 'https://github.com/valid/repo';
        // Mock GetNetScore to return null for this test
        (netScoreModule.GetNetScore as jest.Mock).mockResolvedValueOnce(null);
        
        await expect(PackageService.processPackageFromUrl(url))
            .rejects
            .toThrow('Failed to calculate metrics');
    });
});