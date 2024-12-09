import { calculateBusFactor } from '../src/metrics/busFactor';
import { RepoDetails } from '../src/apiProcess/gitApiProcess';
import { log } from '../src/logger';

jest.mock("../src/logger", () => ({
    log: {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn()
    }
}));

describe('Bus Factor Calculations', () => {
    describe('calculateBusFactor', () => {
        it('should calculate high bus factor for evenly distributed contributions', () => {
            const metrics: RepoDetails = {
                owner: "owner",
                repo: "repo",
                createdAt: "2021-01-01",
                stars: 100,
                openIssues: 10,
                forks: 50,
                license: "MIT",
                commitsData: [],
                issuesData: [],
                contributorsData: [
                    { name: "Alice", contributions: 100 },
                    { name: "Bob", contributions: 90 },
                    { name: "Charlie", contributions: 80 },
                    { name: "David", contributions: 70 }
                ],
                pullRequests: [],
                files: []
            };

            const result = calculateBusFactor(metrics);
            expect(result).toBeGreaterThan(0.5);
            expect(result).toBeLessThanOrEqual(1);
        });

        it('should calculate low bus factor for uneven distribution', () => {
            const metrics: RepoDetails = {
                owner: "owner",
                repo: "repo",
                createdAt: "2021-01-01",
                stars: 100,
                openIssues: 10,
                forks: 50,
                license: "MIT",
                commitsData: [],
                issuesData: [],
                contributorsData: [
                    { name: "Alice", contributions: 990 },
                    { name: "Bob", contributions: 5 },
                    { name: "Charlie", contributions: 5 }
                ],
                pullRequests: [],
                files: []
            };

            const result = calculateBusFactor(metrics);
            // Since only Alice contributes significantly (others < 0.5%), 
            // and 1/3 contributors is less than 35% of total contributors,
            // this should give a low score
            expect(result).toBeLessThan(1);
        });

        it('should handle no contributors', () => {
            const metrics: RepoDetails = {
                owner: "owner",
                repo: "repo",
                createdAt: "2021-01-01",
                stars: 100,
                openIssues: 10,
                forks: 50,
                license: "MIT",
                commitsData: [],
                issuesData: [],
                contributorsData: [],
                pullRequests: [],
                files: []
            };

            const result = calculateBusFactor(metrics);
            expect(result).toBe(0);
            expect(log.debug).toHaveBeenCalledWith("No contributors available for bus factor calculation");
        });

        it('should handle single contributor', () => {
            const metrics: RepoDetails = {
                owner: "owner",
                repo: "repo",
                createdAt: "2021-01-01",
                stars: 100,
                openIssues: 10,
                forks: 50,
                license: "MIT",
                commitsData: [],
                issuesData: [],
                contributorsData: [
                    { name: "Alice", contributions: 100 }
                ],
                pullRequests: [],
                files: []
            };

            const result = calculateBusFactor(metrics);
            expect(result).toBe(0);
            expect(log.debug).toHaveBeenCalledWith("Bus factor is 1 as there is only 1 contributor");
        });

        it('should handle contributors with zero commits', () => {
            const metrics: RepoDetails = {
                owner: "owner",
                repo: "repo",
                createdAt: "2021-01-01",
                stars: 100,
                openIssues: 10,
                forks: 50,
                license: "MIT",
                commitsData: [],
                issuesData: [],
                contributorsData: [
                    { name: "Alice", contributions: 0 },
                    { name: "Bob", contributions: 0 }
                ],
                pullRequests: [],
                files: []
            };

            const result = calculateBusFactor(metrics);
            expect(result).toBe(0);
            expect(log.debug).toHaveBeenCalledWith("No commits available for bus factor calculation");
        });

        it('should handle mixed contribution levels', () => {
            const metrics: RepoDetails = {
                owner: "owner",
                repo: "repo",
                createdAt: "2021-01-01",
                stars: 100,
                openIssues: 10,
                forks: 50,
                license: "MIT",
                commitsData: [],
                issuesData: [],
                contributorsData: [
                    { name: "Alice", contributions: 500 },
                    { name: "Bob", contributions: 300 },
                    { name: "Charlie", contributions: 200 },
                    { name: "David", contributions: 100 },
                    { name: "Eve", contributions: 50 }
                ],
                pullRequests: [],
                files: []
            };

            const result = calculateBusFactor(metrics);
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThanOrEqual(1);
            expect(log.info).toHaveBeenCalledWith("In calculateBusFactor, starting to calculate bus factor...");
        });

        it('should handle contributors below threshold', () => {
            const metrics: RepoDetails = {
                owner: "owner",
                repo: "repo",
                createdAt: "2021-01-01",
                stars: 100,
                openIssues: 10,
                forks: 50,
                license: "MIT",
                commitsData: [],
                issuesData: [],
                contributorsData: [
                    { name: "Alice", contributions: 980 },
                    { name: "Bob", contributions: 5 },    // < 0.5% of total
                    { name: "Charlie", contributions: 4 } // < 0.5% of total
                ],
                pullRequests: [],
                files: []
            };

            const result = calculateBusFactor(metrics);
            // Since only Alice remains after filtering (others < 0.5%),
            // and 1 core contributor for 1 total contributor is > 35%,
            // this should give a high score
            expect(result).toBe(1);
        });
    });
});
