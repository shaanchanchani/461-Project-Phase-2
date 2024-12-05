import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService, dynamoDBService } from './dynamoDBService';
import { S3Service } from './s3Service';
import { log } from '../logger';
import { URL } from 'url';
import { checkUrlType, UrlType } from '../utils/urlUtils';
import { PackageTableItem, PackageVersionTableItem, PackageUploadResponse } from '../types';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { GetNetScore } from '../metrics/netScore';
import { metricService } from './metricService';

export class PackageUploadService {
  private db: DynamoDBService;
  private s3Service: S3Service;
  private githubHeaders: Record<string, string>;

  constructor() {
    this.db = dynamoDBService;
    this.s3Service = new S3Service();
    this.githubHeaders = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
    };
  }

  public async uploadPackageFromUrl(url: string, jsProgram?: string, debloat: boolean = false, userId?: string): Promise<PackageUploadResponse> {
    try {
      // Validate URL
      this.validateUrl(url);
      const urlType = checkUrlType(url);
      if (urlType === UrlType.Invalid) {
        throw new Error('Invalid URL format. Please use a valid GitHub (github.com/owner/repo or github.com/owner/repo/tree/version) or npm (npmjs.com/package/name) URL');
      }

      // If npm URL, get the GitHub URL first
      let githubUrl = url;
      if (urlType === UrlType.npm) {
        githubUrl = await this.handleNpmUrl(url);
      }


      // Extract package info from URL
      const { name, version, description } = await this.extractPackageInfo(githubUrl);

      // Check if this exact version already exists
      const existingPackage = await this.db.getPackageByName(name);
      if (existingPackage) {
        const existingVersion = await this.db.getPackageVersion(existingPackage.package_id, version);
        if (existingVersion) {
          throw new Error(`Package ${name} version ${version} already exists`);
        }
      }
      // Check package metrics before proceeding
      const metrics = await this.checkPackageMetrics(githubUrl);
      // Generate unique IDs
      const packageId = existingPackage?.package_id || uuidv4();
      const versionId = uuidv4();

      // Fetch package content and convert to base64
      const { zipBuffer, base64Content } = await this.fetchAndZipPackage(githubUrl);

      // Upload to S3
      const s3Key = `packages/${packageId}/content.zip`;
      await this.s3Service.uploadPackageContent(s3Key, zipBuffer);
      log.info(`Uploaded package to S3 with key: ${s3Key}`);

      // Get the package size after uploading
      const packageSize = await this.s3Service.getPackageSize(packageId);

      // Create package entry in DynamoDB
      const packageData: PackageTableItem = {
        package_id: packageId,
        name,
        latest_version: version,
        description,
        created_at: new Date().toISOString(),
        user_id: userId || 'anonymous'
      };

      // Create version entry in DynamoDB
      const versionData: PackageVersionTableItem = {
        version_id: versionId,
        package_id: packageId,
        version,
        zip_file_path: s3Key,
        debloated: debloat,
        created_at: new Date().toISOString(),
        standalone_cost: packageSize,
        total_cost: packageSize  // For now, total cost equals standalone cost until we implement dependencies
      };

      // Store the metrics
      await metricService.createMetricEntry(versionId, metrics);

      if (!existingPackage) {
        // Only create a new package entry if this is a completely new package
        await this.db.createPackageEntry(packageData);
      } else {
        // For existing packages, only update the latest version if this version is newer
        const currentVersion = existingPackage.latest_version;
        if (this.isNewerVersion(version, currentVersion)) {
          await this.db.updatePackageLatestVersion(existingPackage.name, version);
        }
      }

      // Always create a new version entry
      await this.db.createPackageVersion(versionData);

      return {
        metadata: {
          Name: name,
          Version: version,
          ID: packageId
        },
        data: {
          Content: base64Content,
          JSProgram: jsProgram || ''
        }
      };
    } catch (error) {
      throw error;
    }
  }

  public async uploadPackageFromZip(content: string, jsProgram?: string, debloat: boolean = false, userId?: string): Promise<PackageUploadResponse> {
    try {
      // Decode base64 content to buffer
      const zipBuffer = Buffer.from(content, 'base64');
      
      // Extract package info from zip
      const zip = new AdmZip(zipBuffer);
      const packageJsonEntry = zip.getEntry('package.json');
      if (!packageJsonEntry) {
        throw new Error('Invalid zip file: package.json not found');
      }
      
      let packageJson;
      try {
        packageJson = JSON.parse(packageJsonEntry.getData().toString());
      } catch (error) {
        throw new Error('Invalid package.json: not valid JSON');
      }

      if (!packageJson.name) {
        throw new Error('Invalid package.json: missing name field');
      }

      const name = packageJson.name;
      const version = packageJson.version || '1.0.0';
      const description = packageJson.description || '';

      // Extract repository URL from package.json
      let repoUrl = packageJson.repository?.url || packageJson.homepage;
      if (!repoUrl) {
        throw new Error('No repository URL found in package.json');
      }

      // Sanitize the URL (using same logic as handleNpmUrl)
      repoUrl = repoUrl
        .replace("git+", "")
        .replace(".git", "")
        .replace("git:", "")
        .replace('git@github.com:', 'https://github.com/')
        .replace('git+https://github.com/', 'https://github.com/')
        .replace('git+ssh://git@github.com/', 'https://github.com/');

      // Validate that it's a GitHub URL
      const urlObj = new URL(repoUrl);
      if (urlObj.hostname !== 'github.com') {
        throw new Error('Only GitHub repository URLs are supported');
      }

      // Check if this exact version already exists
      const existingPackage = await this.db.getPackageByName(name);
      if (existingPackage) {
        const existingVersion = await this.db.getPackageVersion(existingPackage.package_id, version);
        if (existingVersion) {
          throw new Error(`Package ${name} version ${version} already exists`);
        }
      }

      // First verify the repository exists
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const [owner, repo] = pathParts;

      try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: this.githubHeaders
        });
        if (response.status !== 200) {
          throw new Error(`GitHub repository ${owner}/${repo} not found`);
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          throw new Error(`GitHub repository ${owner}/${repo} not found`);
        }
        throw error;
      }

      // Check package metrics after confirming package doesn't exist and repository exists
      const metrics = await this.checkPackageMetrics(repoUrl);

      // Generate unique IDs
      const packageId = existingPackage?.package_id || uuidv4();
      const versionId = uuidv4();

      // Upload to S3
      const s3Key = `packages/${packageId}/content.zip`;
      await this.s3Service.uploadPackageContent(s3Key, zipBuffer);
      log.info(`Uploaded package to S3 with key: ${s3Key}`);

      // Get the package size after uploading
      const packageSize = await this.s3Service.getPackageSize(packageId);

      // Create package entry in DynamoDB
      const packageData: PackageTableItem = {
        package_id: packageId,
        name,
        latest_version: version,
        description,
        created_at: new Date().toISOString(),
        user_id: userId || 'anonymous'
      };

      // Create version entry in DynamoDB
      const versionData: PackageVersionTableItem = {
        version_id: versionId,
        package_id: packageId,
        version,
        zip_file_path: s3Key,
        debloated: debloat,
        created_at: new Date().toISOString(),
        standalone_cost: packageSize,
        total_cost: packageSize  // For now, total cost equals standalone cost until we implement dependencies
      };

      // Store the metrics
      await metricService.createMetricEntry(versionId, metrics);

      if (!existingPackage) {
        // Only create a new package entry if this is a completely new package
        await this.db.createPackageEntry(packageData);
      } else {
        // For existing packages, only update the latest version if this version is newer
        const currentVersion = existingPackage.latest_version;
        if (this.isNewerVersion(version, currentVersion)) {
          await this.db.updatePackageLatestVersion(existingPackage.name, version);
        }
      }

      // Always create a new version entry
      await this.db.createPackageVersion(versionData);

      return {
        metadata: {
          Name: name,
          Version: version,
          ID: packageId
        },
        data: {
          Content: content,
          JSProgram: jsProgram || ''
        }
      };
    } catch (error: any) {
      // Add more context to errors
      if (error.message?.includes('404')) {
        throw new Error(`GitHub repository not found: ${error.message}`);
      }
      if (error.message?.includes('rate limit') || error.message?.includes('504')) {
        throw new Error(`GitHub API error: ${error.message}`);
      }
      throw error;
    }
  }

  private validateUrl(url: string): void {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'github.com' && urlObj.hostname !== 'www.npmjs.com') {
      throw new Error('Invalid URL format. Please use a valid GitHub (github.com/owner/repo or github.com/owner/repo/tree/version) or npm (npmjs.com/package/name) URL');
    }
  }

  private async extractPackageInfo(url: string): Promise<{ name: string; version: string; description: string }> {
    const urlObj = new URL(url);
    let name: string;
    let version: string = '1.0.0';
    let description: string = '';
    let ref: string | undefined;

    if (urlObj.hostname === 'github.com') {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // Handle version in URL if present
      if (pathParts.length >= 4 && pathParts[2] === 'tree') {
        ref = pathParts[3];
        version = ref.replace(/^v/, ''); // Remove 'v' prefix if present
        const [owner, repo] = pathParts;
        
        try {
          // Get repository info
          const repoResponse = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}`,
            { headers: this.githubHeaders }
          );
          
          name = repo;
          description = repoResponse.data.description || '';

          // Try to get package.json from specific version
          try {
            const packageJsonUrl = `https://api.github.com/repos/${owner}/${repo}/contents/package.json${ref ? `?ref=${ref}` : ''}`;
            const packageJsonResponse = await axios.get(packageJsonUrl, { headers: this.githubHeaders });
            
            const content = Buffer.from(packageJsonResponse.data.content, 'base64').toString();
            const packageJson = JSON.parse(content);
            name = packageJson.name || repo;
            description = packageJson.description || description;
          } catch (error) {
            // Just continue if package.json not found
          }

          // If no description yet, try README from specific version
          if (!description) {
            try {
              const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme${ref ? `?ref=${ref}` : ''}`;
              const readmeResponse = await axios.get(readmeUrl, { headers: this.githubHeaders });
              const readme = Buffer.from(readmeResponse.data.content, 'base64').toString();
              description = readme.split('\n')[0] || '';
            } catch (error) {
              // Just continue if README not found
            }
          }
        } catch (error: any) {
          if (error.response?.status === 404) {
            throw new Error('Invalid request-check file/URL and try again');
          }
          if (error.response?.status === 403) {
            throw new Error('Authentication failed');
          }
          throw new Error('Invalid request-check file/URL and try again');
        }
      } else if (pathParts.length === 2) {
        // Standard case: github.com/owner/repo
        const [owner, repo] = pathParts;
        
        try {
          // Get repository info
          const repoResponse = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}`,
            { headers: this.githubHeaders }
          );
          
          name = repo;
          description = repoResponse.data.description || '';

          // Try to get package.json for version
          try {
            const packageJsonUrl = `https://api.github.com/repos/${owner}/${repo}/contents/package.json`;
            const packageJsonResponse = await axios.get(packageJsonUrl, { headers: this.githubHeaders });
            
            const content = Buffer.from(packageJsonResponse.data.content, 'base64').toString();
            const packageJson = JSON.parse(content);
            version = packageJson.version || '1.0.0';
            name = packageJson.name || repo;
            description = packageJson.description || description;
          } catch (error) {
            // Just continue if package.json not found
          }

          // If no description yet, try README
          if (!description) {
            try {
              const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
              const readmeResponse = await axios.get(readmeUrl, { headers: this.githubHeaders });
              const readme = Buffer.from(readmeResponse.data.content, 'base64').toString();
              description = readme.split('\n')[0] || '';
            } catch (error) {
              // Just continue if README not found
            }
          }
        } catch (error: any) {
          if (error.response?.status === 404) {
            throw new Error('Invalid request-check file/URL and try again');
          }
          if (error.response?.status === 403) {
            throw new Error('Authentication failed');
          }
          throw new Error('Invalid request-check file/URL and try again');
        }
      } else {
        throw new Error('GitHub URL must be in format: github.com/owner/repo or github.com/owner/repo/tree/version');
      }
    } else {
      throw new Error('Only GitHub URLs are supported at this time');
    }

    return { name, version, description };
  }

  private async fetchAndZipPackage(url: string): Promise<{ zipBuffer: Buffer; base64Content: string }> {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    let ref: string | undefined;
    
    // Handle version in URL if present
    if (pathParts.length >= 4 && pathParts[2] === 'tree') {
      ref = pathParts[3];
    }
    
    const [owner, repo] = pathParts;

    try {
      // Get the zipball from GitHub, with version if specified
      const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball${ref ? `/${ref}` : ''}`;
      const response = await axios.get(zipUrl, { 
        headers: this.githubHeaders,
        responseType: 'arraybuffer'  // Important: we want the raw binary data
      });

      const zipBuffer = Buffer.from(response.data);
      return {
        zipBuffer,
        base64Content: zipBuffer.toString('base64')
      };
    } catch (error) {
      throw error;
    }
  }

  private async handleNpmUrl(url: string): Promise<string> {
    try {
      log.info('Processing npm URL...');
      const packagePath = url.split('/package/')[1];

      // Handle scoped packages with versions
      let packageName, version;
      if (packagePath.startsWith('@')) {
        // Scoped package
        const scopedParts = packagePath.split('@');
        if (scopedParts.length === 3) {
          // Has version
          packageName = `@${scopedParts[1]}`;
          version = scopedParts[2];
        } else {
          // No version
          packageName = scopedParts[0];
          version = scopedParts[1];
        }
      } else {
        // Non-scoped package
        [packageName, version] = packagePath.split('@');
      }

      // Fetch package info
      const npmUrl = `https://registry.npmjs.org/${packageName}`;
      const response = await axios.get(npmUrl);

      // Get the specific version data if available
      const repositoryUrl = response.data.repository?.url;

      if (!repositoryUrl) {
        throw new Error(`GitHub repository URL not found for ${packageName}`);
      }

      const sanitizedUrl = repositoryUrl
        .replace("git+", "")
        .replace(".git", "")
        .replace("git:", "")
        .replace('git@github.com:', 'https://github.com/')
        .replace('git+https://github.com/', 'https://github.com/')
        .replace('git+ssh://git@github.com/', 'https://github.com/');

      
      if (version) {
        const sanitizedVersionUrl = `${sanitizedUrl}/tree/v${version}`;
        log.info(`Using version-specific URL: ${sanitizedVersionUrl}`);
        return sanitizedVersionUrl;
      } 
      log.info(`Using default URL: ${sanitizedUrl}`);
      return sanitizedUrl;
    } catch (error: any) {
      log.error('Error in handleNpmUrl:', error);
      throw error;
    }
  }

  private async checkPackageMetrics(url: string): Promise<{
    net_score: number;
    bus_factor: number;
    ramp_up: number;
    responsive_maintainer: number;
    license_score: number;
    good_pinning_practice: number;
    pull_request: number;
    correctness: number;
    bus_factor_latency: number;
    ramp_up_latency: number;
    responsive_maintainer_latency: number;
    license_score_latency: number;
    good_pinning_practice_latency: number;
    pull_request_latency: number;
    correctness_latency: number;
    net_score_latency: number;
  }> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2 seconds

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Extract owner and repo from GitHub URL
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        const [owner, repo] = pathParts;

        // First verify the repository exists
        try {
          const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: this.githubHeaders
          });
          if (response.status !== 200) {
            throw new Error(`GitHub repository ${owner}/${repo} not found`);
          }
        } catch (error: any) {
          if (error.response?.status === 404) {
            throw new Error(`GitHub repository ${owner}/${repo} not found`);
          }
          throw error;
        }

        // Calculate metrics
        const metrics = await GetNetScore(owner, repo, url);
        
        if (!metrics) {
          log.warn(`Attempt ${attempt}: Failed to calculate package metrics, metrics is null`);
          if (attempt === MAX_RETRIES) {
            throw new Error('Failed to calculate package metrics after all retries');
          }
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }

        // You can adjust this threshold based on your requirements
        const MINIMUM_NET_SCORE = 0.5;
        
        if (metrics.net_score < MINIMUM_NET_SCORE) {
          throw new Error(`Package does not meet quality requirements. Net score: ${metrics.net_score}`);
        }

        log.info(`Package metrics check passed. Net score: ${metrics.net_score}`);

        return {
          net_score: metrics.net_score,
          bus_factor: metrics.bus_factor,
          ramp_up: metrics.ramp_up,
          responsive_maintainer: metrics.responsive_maintainer,
          license_score: metrics.license_score,
          good_pinning_practice: metrics.good_pinning_practice,
          pull_request: metrics.pull_request,
          correctness: metrics.correctness,
          bus_factor_latency: metrics.bus_factor_latency,
          ramp_up_latency: metrics.ramp_up_latency,
          responsive_maintainer_latency: metrics.responsive_maintainer_latency,
          license_score_latency: metrics.license_score_latency,
          good_pinning_practice_latency: metrics.good_pinning_practice_latency,
          pull_request_latency: metrics.pull_request_latency,
          correctness_latency: metrics.correctness_latency,
          net_score_latency: metrics.net_score_latency
        };
      } catch (error: any) {
        log.error(`Attempt ${attempt}: Error checking package metrics:`, error);
        
        // If repository doesn't exist, fail immediately
        if (error.message?.includes('not found')) {
          throw error;
        }
        
        // Only retry on rate limits or timeouts
        if (error.message?.includes('504') || error.message?.includes('429')) {
          if (attempt === MAX_RETRIES) {
            throw new Error(`GitHub API error after ${MAX_RETRIES} retries: ${error.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
        
        // For any other error, fail immediately
        throw error;
      }
    }

    throw new Error('Failed to calculate package metrics after all retries');
  }

  private isNewerVersion(version: string, currentVersion: string): boolean {
    const versionParts = version.split('.').map(Number);
    const currentVersionParts = currentVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(versionParts.length, currentVersionParts.length); i++) {
      const versionPart = versionParts[i] || 0;
      const currentVersionPart = currentVersionParts[i] || 0;

      if (versionPart > currentVersionPart) {
        return true;
      } else if (versionPart < currentVersionPart) {
        return false;
      }
    }

    return false;
  }
}
