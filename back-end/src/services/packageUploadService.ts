import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService, dynamoDBService } from './dynamoDBService';
import { S3Service } from './s3Service';
import { log } from '../logger';
import { URL } from 'url';
import { checkUrlType, UrlType } from '../utils/urlUtils';
import { PackageTableItem, PackageVersionTableItem, PackageUploadResponse } from '../types';
import axios from 'axios';
import AdmZip from 'adm-zip';

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

  public async uploadPackageFromUrl(url: string, jsProgram?: string, debloat: boolean = false): Promise<PackageUploadResponse> {
    try {
      // Validate URL
      const urlType = checkUrlType(url);
      if (urlType === UrlType.Invalid) {
        throw new Error('Invalid URL format. Please use a valid GitHub (github.com/owner/repo) or npm (npmjs.com/package/name) URL');
      }

      // Extract package info from URL
      const { name, version, description } = await this.extractPackageInfo(url);

      // Check if package already exists before downloading and uploading
      const existingPackage = await this.db.getPackageByName(name);
      if (existingPackage) {
        throw new Error(`Package ${name} already exists`);
      }

      // Generate unique IDs
      const packageId = uuidv4();
      const versionId = uuidv4();

      // Fetch package content and convert to base64
      const { zipBuffer, base64Content } = await this.fetchAndZipPackage(url);

      // Upload to S3
      const s3Key = await this.s3Service.uploadPackageContent(packageId, zipBuffer);
      log.info(`Uploaded package to S3 with key: ${s3Key}`);

      // Create package entry in DynamoDB
      const packageData: PackageTableItem = {
        package_id: packageId,
        name,
        latest_version: version,
        description,
        created_at: new Date().toISOString()
      };

      // Create version entry in DynamoDB
      const versionData: PackageVersionTableItem = {
        version_id: versionId,
        package_id: packageId,
        version,
        zip_file_path: s3Key,
        debloated: debloat,
        created_at: new Date().toISOString()
      };

      await this.db.createPackageEntry(packageData);
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
      log.error('Error uploading package:', error);
      throw error;
    }
  }

  private async extractPackageInfo(url: string): Promise<{ name: string; version: string; description: string }> {
    const urlObj = new URL(url);
    let name: string;
    let version: string = '1.0.0';
    let description: string = '';

    if (urlObj.hostname === 'github.com') {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length !== 2) {
        throw new Error('GitHub URL must be in format: github.com/owner/repo');
      }
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
          const packageJsonResponse = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
            { headers: this.githubHeaders }
          );
          
          const content = Buffer.from(packageJsonResponse.data.content, 'base64').toString();
          const packageJson = JSON.parse(content);
          version = packageJson.version || '1.0.0';
          name = packageJson.name || repo;
          description = packageJson.description || description;
        } catch (error) {
          log.warn('No package.json found, using default version');
        }

        // If no description yet, try README
        if (!description) {
          try {
            const readmeResponse = await axios.get(
              `https://api.github.com/repos/${owner}/${repo}/readme`,
              { headers: this.githubHeaders }
            );
            const readme = Buffer.from(readmeResponse.data.content, 'base64').toString();
            description = readme.split('\n')[0] || '';
          } catch (error) {
            log.warn('No README found for description');
          }
        }
      } catch (error: any) {
        log.error('Error fetching GitHub repository info:', error);
        if (error.response?.status === 404) {
          throw new Error('Invalid request-check file/URL and try again');
        }
        if (error.response?.status === 403) {
          throw new Error('Authentication failed');
        }
        throw new Error('Invalid request-check file/URL and try again');
      }
    } else {
      throw new Error('Only GitHub URLs are supported at this time');
    }

    return { name, version, description };
  }

  private async fetchAndZipPackage(url: string): Promise<{ zipBuffer: Buffer; base64Content: string }> {
    const urlObj = new URL(url);
    const [owner, repo] = urlObj.pathname.split('/').filter(Boolean);

    try {
      // Get the zipball directly from GitHub
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/zipball`,
        { 
          headers: this.githubHeaders,
          responseType: 'arraybuffer'  // Important: we want the raw binary data
        }
      );

      const zipBuffer = Buffer.from(response.data);
      return {
        zipBuffer,
        base64Content: zipBuffer.toString('base64')
      };
    } catch (error) {
      log.error('Error downloading repository zipball:', error);
      throw error;
    }
  }
}