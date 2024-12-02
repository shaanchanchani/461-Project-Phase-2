// src/services/packageService.ts
import { log } from '../logger';
import type { Package, PackageData, PackageMetadata, PackageRating, ProcessedPackage } from '../types';
import { DynamoDBService, dynamoDBService } from './dynamoDBService';
import { PackageDownloadService } from './packageDownloadService';
import { checkUrlType, processUrl, UrlType } from '../utils/urlUtils';
import { v4 as uuidv4 } from 'uuid';
import { GetNetScore } from '../metrics/netScore';

export class PackageService {
    private db: DynamoDBService;

    constructor() {
        this.db = dynamoDBService;
    }

    async processPackageFromUrl(url: string): Promise<ProcessedPackage> {
        try {
            log.info(`Processing package from URL: ${url}`);
            
            // Parse URL to get owner and repo
            const urlType = checkUrlType(url);
            if (!urlType) {
                throw new Error('Invalid URL format');
            }
            const repoInfo = await processUrl(urlType, url);
            if (!repoInfo) {
                throw new Error('Failed to process URL');
            }
            const { owner, repo } = repoInfo;
            
            // Calculate metrics first to ensure package is valid
            const metrics = await GetNetScore(owner, repo, url);
            if (!metrics) {
                throw new Error('Failed to calculate metrics');
            }

            // Get version from GitHub
            const version = await this.getGitHubVersion(owner, repo) || "1.0.0"; // Default to "1.0.0" if null
            
            // Create package in DynamoDB
            const packageId = `${owner}/${repo}`;
            const packageRating: PackageRating = {
                BusFactor: metrics.BusFactor,
                Correctness: metrics.Correctness,
                RampUp: metrics.RampUp,
                ResponsiveMaintainer: metrics.ResponsiveMaintainer,
                LicenseScore: metrics.License,
                GoodPinningPractice: 0,
                PullRequest: 0,
                NetScore: metrics.NetScore,
                BusFactorLatency: metrics.BusFactor_Latency,
                CorrectnessLatency: metrics.Correctness_Latency,
                RampUpLatency: metrics.RampUp_Latency,
                ResponsiveMaintainerLatency: metrics.ResponsiveMaintainer_Latency,
                LicenseScoreLatency: metrics.License_Latency,
                GoodPinningPracticeLatency: 0,
                PullRequestLatency: 0,
                NetScoreLatency: metrics.NetScore_Latency
            };

            const packageMetadata: PackageMetadata = {
                Name: repo,
                Version: version,
                ID: packageId
            };

            const pkg: Package = {
                metadata: packageMetadata,
                data: {
                    URL: url
                }
            };

            await this.db.createPackage(pkg);
            await this.db.updatePackageRating(packageId, packageRating);

            const processedPackage: ProcessedPackage = {
                url,
                metrics: {
                    BusFactor: metrics.BusFactor,
                    Correctness: metrics.Correctness,
                    RampUp: metrics.RampUp,
                    ResponsiveMaintainer: metrics.ResponsiveMaintainer,
                    LicenseScore: metrics.License,
                    GoodPinningPractice: 0,
                    PullRequest: 0,
                    NetScore: metrics.NetScore
                },
                timestamp: new Date().toISOString()
            };

            return processedPackage;
        } catch (error) {
            if (error instanceof Error) {
                log.error(`Error processing package from URL ${url}: ${error.message}`);
                throw error;
            } else {
                const err = new Error(`Unknown error processing package from URL ${url}`);
                log.error(err.message);
                throw err;
            }
        }
    }

    public async getGitHubVersion(owner: string, repo: string): Promise<string | null> {
        try {
            // Try to get package.json content from the default branch
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        // Add GitHub token if you have one
                        // 'Authorization': `token ${process.env.GITHUB_TOKEN}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch package.json');
            }

            const data = await response.json();
            // GitHub API returns content as base64
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            const packageJson = JSON.parse(content);

            return packageJson.version || null;
        } catch (error) {
            log.warn(`Could not fetch version from GitHub: ${error}`);
            return null;
        }
    }

    public async getNpmVersion(packageName: string): Promise<string | null> {
        try {
            const response = await fetch(`https://registry.npmjs.org/${packageName}`);
            if (!response.ok) {
                throw new Error('Failed to fetch npm package info');
            }

            const data = await response.json();
            return data['dist-tags']?.latest || null;
        } catch (error) {
            log.warn(`Could not fetch version from npm: ${error}`);
            return null;
        }
    }

    public async getPackageByName(name: string): Promise<Package | null> {
        try {
            // Query packages by name pattern
            const result = await this.db.getPackage(name);
            return result;
        } catch (error) {
            log.error('Error getting package by name:', error);
            return null;
        }
    }

    public async createPackage(packageData: PackageData, metadata: PackageMetadata): Promise<Package> {
        try {
            // Validate package content if provided
            if (packageData.Content) {
                const buffer = Buffer.from(packageData.Content, 'base64');
                
                // Check file size (50MB limit)
                if (buffer.length > 50 * 1024 * 1024) {
                    throw new Error('Package size exceeds limit');
                }

                // Here you would add logic to validate if it's a valid npm package
                // This is a placeholder for the actual validation
                if (!this.isValidNpmPackage(buffer)) {
                    throw new Error('Invalid package format');
                }
            }

            // If URL is provided, try to fetch version
            let version = metadata.Version;
            if (packageData.URL) {
                try {
                    const urlObj = new URL(packageData.URL);
                    if (urlObj.hostname === 'github.com') {
                        const pathParts = urlObj.pathname.split('/').filter(Boolean);
                        if (pathParts.length === 2) {
                            const [owner, repo] = pathParts;
                            const githubVersion = await this.getGitHubVersion(owner, repo);
                            if (githubVersion) version = githubVersion;
                        }
                    } else if (urlObj.hostname.includes('npmjs.com')) {
                        const packageName = urlObj.pathname.split('/package/')[1];
                        if (packageName) {
                            const npmVersion = await this.getNpmVersion(packageName.split('@')[0]);
                            if (npmVersion) version = npmVersion;
                        }
                    }
                } catch (error) {
                    log.warn('Error fetching version:', error);
                    // Continue with default version
                }
            }

            // Create package in database
            const pkg: Package = {
                metadata: {
                    ...metadata,
                    Version: version
                },
                data: {
                    ...packageData,
                    // Don't store the Content in the database if it's too large
                    Content: packageData.Content 
                        ? (packageData.Content.length > 1000 
                            ? '[LARGE_BINARY_CONTENT]' 
                            : packageData.Content)
                        : undefined
                }
            };

            await this.db.createPackage(pkg);
            return pkg;
        } catch (error) {
            log.error('Error in createPackage:', error);
            throw error;
        }
    }

    private isValidNpmPackage(buffer: Buffer): boolean {
        try {
            // This is a basic check - you might want to add more sophisticated validation
            // For example, checking for package.json, valid structure, etc.
            return buffer.length > 0;
        } catch (error) {
            return false;
        }
    }

    async getPackage(id: string): Promise<Package> {
        const pkg = await this.db.getPackage(id);
        if (!pkg) {
            throw new Error('Package not found');
        }
        return pkg;
    }

    async updatePackage(id: string, packageData: PackageData): Promise<void> {
        // Not implemented yet
        throw new Error('Not implemented');
    }

    async resetRegistry(): Promise<void> {
        // Not implemented yet
        throw new Error('Not implemented');
    }
}