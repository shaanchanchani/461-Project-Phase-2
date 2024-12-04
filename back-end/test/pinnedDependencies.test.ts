import { calculatePinnedDependenciesMetric } from '../src/metrics/pinnedDependencies';
import { RepoDetails } from '../src/apiProcess/gitApiProcess';

describe('Pinned Dependencies Metric', () => {
    it('should return 0 when no package.json exists', () => {
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

        const score = calculatePinnedDependenciesMetric(metrics);
        expect(score).toBe(0);
    });

    it('should return 1 when no dependencies exist', () => {
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
            files: [{
                path: 'package.json',
                content: JSON.stringify({
                    name: 'test',
                    version: '1.0.0'
                })
            }]
        };

        const score = calculatePinnedDependenciesMetric(metrics);
        expect(score).toBe(1);
    });

    it('should calculate correct score for mixed dependencies', () => {
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
            files: [{
                path: 'package.json',
                content: JSON.stringify({
                    dependencies: {
                        'pinned-dep': '1.2.3',
                        'range-dep': '^1.2.3',
                        'git-dep': 'git+https://github.com/user/repo#1234567890123456789012345678901234567890',
                        'star-dep': '*'
                    }
                })
            }]
        };

        const score = calculatePinnedDependenciesMetric(metrics);
        expect(score).toBe(0.5); // 2 pinned (exact version and git hash) out of 4
    });

    it('should give bonus for having package-lock.json', () => {
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
            files: [
                {
                    path: 'package.json',
                    content: JSON.stringify({
                        dependencies: {
                            'pinned-dep': '1.2.3',
                            'range-dep': '^1.2.3'
                        }
                    })
                },
                {
                    path: 'package-lock.json',
                    content: '{}'
                }
            ]
        };

        const score = calculatePinnedDependenciesMetric(metrics);
        expect(score).toBe(0.6); // 0.5 (1 pinned out of 2) + 0.1 bonus
    });

    it('should handle invalid package.json content', () => {
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
            files: [{
                path: 'package.json',
                content: 'invalid json'
            }]
        };

        const score = calculatePinnedDependenciesMetric(metrics);
        expect(score).toBe(0);
    });
});
