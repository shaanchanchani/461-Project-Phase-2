import { calculatePullRequestMetric } from '../src/metrics/reviewPullReqs';
import { RepoDetails } from '../src/apiProcess/gitApiProcess';

describe('Pull Request Review Metric', () => {
    it('should return 0 when no pull requests exist', () => {
        const metrics: RepoDetails = {
            owner: 'test',
            repo: 'test',
            createdAt: '2021-01-01',
            stars: 0,
            openIssues: 0,
            forks: 0,
            license: null,
            commitsData: [],
            issuesData: [],
            contributorsData: [],
            pullRequests: [],
            files: []
        };

        const score = calculatePullRequestMetric(metrics);
        expect(score).toBe(0);
    });

    it('should calculate correct score for PRs with no reviews', () => {
        const metrics: RepoDetails = {
            owner: 'test',
            repo: 'test',
            createdAt: '2021-01-01',
            stars: 0,
            openIssues: 0,
            forks: 0,
            license: null,
            commitsData: [],
            issuesData: [],
            contributorsData: [],
            pullRequests: [
                { number: 1, reviews: [] },
                { number: 2, reviews: [] }
            ],
            files: []
        };

        const score = calculatePullRequestMetric(metrics);
        expect(score).toBe(0); // 0 reviewed PRs
    });

    it('should calculate correct score for fully reviewed PRs', () => {
        const metrics: RepoDetails = {
            owner: 'test',
            repo: 'test',
            createdAt: '2021-01-01',
            stars: 0,
            openIssues: 0,
            forks: 0,
            license: null,
            commitsData: [],
            issuesData: [],
            contributorsData: [],
            pullRequests: [
                { 
                    number: 1,
                    reviews: [
                        { id: 1, user: { login: 'reviewer1' } },
                        { id: 2, user: { login: 'reviewer2' } }
                    ]
                },
                { 
                    number: 2,
                    reviews: [
                        { id: 3, user: { login: 'reviewer3' } }
                    ]
                }
            ],
            files: []
        };

        // reviewRatio = 2/2 = 1.0
        // avgReviewers = min((3/2)/3, 1) = 0.25
        // score = (1.0 * 0.6) + (0.25 * 0.3) = 0.6 + 0.075 = 0.675 ≈ 0.75
        const score = calculatePullRequestMetric(metrics);
        expect(score).toBe(0.75);
    });

    it('should give bonus for having PR template', () => {
        const metrics: RepoDetails = {
            owner: 'test',
            repo: 'test',
            createdAt: '2021-01-01',
            stars: 0,
            openIssues: 0,
            forks: 0,
            license: null,
            commitsData: [],
            issuesData: [],
            contributorsData: [],
            pullRequests: [
                { 
                    number: 1,
                    body: '## Description\nThis PR adds a new feature',
                    reviews: [
                        { id: 1, user: { login: 'reviewer1' } }
                    ]
                }
            ],
            files: []
        };

        // reviewRatio = 1/1 = 1.0
        // avgReviewers = min((1/1)/3, 1) = 0.333
        // baseScore = (1.0 * 0.6) + (0.333 * 0.3) = 0.6 + 0.1 = 0.7
        // finalScore = 0.7 + 0.1 (template bonus) = 0.8
        const score = calculatePullRequestMetric(metrics);
        expect(score).toBe(0.8);
    });

    it('should handle mixed review scenarios', () => {
        const metrics: RepoDetails = {
            owner: 'test',
            repo: 'test',
            createdAt: '2021-01-01',
            stars: 0,
            openIssues: 0,
            forks: 0,
            license: null,
            commitsData: [],
            issuesData: [],
            contributorsData: [],
            pullRequests: [
                { 
                    number: 1,
                    reviews: [
                        { id: 1, user: { login: 'reviewer1' } }
                    ]
                },
                { number: 2, reviews: [] },
                { 
                    number: 3,
                    reviews: [
                        { id: 2, user: { login: 'reviewer2' } },
                        { id: 3, user: { login: 'reviewer3' } }
                    ]
                }
            ],
            files: []
        };

        // reviewRatio = 2/3 ≈ 0.667
        // avgReviewers = min((3/3)/3, 1) = 0.333
        // score = (0.667 * 0.6) + (0.333 * 0.3) = 0.4 + 0.1 = 0.5
        const score = calculatePullRequestMetric(metrics);
        expect(score).toBe(0.5);
    });
});
