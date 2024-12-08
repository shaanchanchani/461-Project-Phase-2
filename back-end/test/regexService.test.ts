// test/regexService.test.ts
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { RegexService } from '../src/services/regexService';
import type { PackageTableItem } from '../src/types';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

// Mock data
const mockPackages: PackageTableItem[] = [
    {
        name: 'express',
        description: 'Fast, unopinionated, minimalist web framework',
        latest_version: '4.18.2',
        package_id: 'express-1',
        user_id: 'user1',
        created_at: '2024-12-07T22:39:59-05:00'
    },
    {
        name: 'express-session',
        description: 'Session middleware for Express',
        latest_version: '1.17.3',
        package_id: 'express-session-1',
        user_id: 'user1',
        created_at: '2024-12-07T22:39:59-05:00'
    },
    {
        name: 'lodash',
        description: 'Modern JavaScript utility library',
        latest_version: '4.17.21',
        package_id: 'lodash-1',
        user_id: 'user2',
        created_at: '2024-12-07T22:39:59-05:00'
    }
];

// Mock DynamoDB service
const mockDb = {
    docClient: {
        send: jest.fn().mockImplementation(async () => ({ Items: mockPackages }))
    }
};

// Mock for empty responses
const emptyResponse = { Items: [] as PackageTableItem[] };

describe('RegexService', () => {
    const regexService = new RegexService(mockDb);

    beforeEach(() => {
        jest.clearAllMocks();
        mockDb.docClient.send.mockClear();
    });

    describe('searchByRegEx', () => {
        it('should find packages matching name pattern', async () => {
            const results = await regexService.searchByRegEx('express.*');
            expect(results).toHaveLength(2);
            expect(results[0].Name).toBe('express');
            expect(results[1].Name).toBe('express-session');
        });

        it('should find packages matching description pattern', async () => {
            const results = await regexService.searchByRegEx('framework');
            expect(results).toHaveLength(1);
            expect(results[0].Name).toBe('express');
        });

        it('should find packages matching version pattern', async () => {
            const results = await regexService.searchByRegEx('4\\..*\\..*');
            expect(results).toHaveLength(2);
            expect(results.map(r => r.Name).sort()).toEqual(['express', 'lodash']);
        });

        it('should return empty array for no matches', async () => {
            const results = await regexService.searchByRegEx('nonexistent');
            expect(results).toHaveLength(0);
        });

        it('should throw error for invalid regex pattern', async () => {
            await expect(regexService.searchByRegEx('[')).rejects.toThrow('Invalid regex pattern');
        });

        it('should handle empty response from DynamoDB', async () => {
            mockDb.docClient.send.mockImplementationOnce(() => Promise.resolve(emptyResponse));
            const results = await regexService.searchByRegEx('test');
            expect(results).toHaveLength(0);
        });
    });

    describe('validateExactMatch', () => {
        it('should return true for exact matches', () => {
            expect(regexService.validateExactMatch('express', 'express')).toBe(true);
            expect(regexService.validateExactMatch('express-1.0', 'express-\\d\\.\\d')).toBe(true);
        });

        it('should return false for partial matches', () => {
            expect(regexService.validateExactMatch('express-session', 'express')).toBe(false);
            expect(regexService.validateExactMatch('express1', 'express\\d{2}')).toBe(false);
        });

        it('should return false for invalid regex', () => {
            expect(regexService.validateExactMatch('express', '[')).toBe(false);
        });
    });

    describe('extraCharsMatch', () => {
        it('should find packages containing name as substring', async () => {
            const result = await regexService.extraCharsMatch('express');
            expect(result).toBe(true); // matches 'express-session'
        });

        it('should return false when no package contains name', async () => {
            const result = await regexService.extraCharsMatch('nonexistent');
            expect(result).toBe(false);
        });

        it('should return false when only exact matches exist', async () => {
            const result = await regexService.extraCharsMatch('lodash');
            expect(result).toBe(false);
        });

        it('should handle empty response from DynamoDB', async () => {
            mockDb.docClient.send.mockImplementationOnce(() => Promise.resolve(emptyResponse));
            const result = await regexService.extraCharsMatch('test');
            expect(result).toBe(false);
        });
    });
});
