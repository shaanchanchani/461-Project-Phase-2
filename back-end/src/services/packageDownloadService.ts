import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { log } from '../logger';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PackageDownloadService {
    private static readonly TEMP_DIR = path.join(process.cwd(), 'temp_packages');

    static async cloneRepository(owner: string, repo: string, branch = 'main'): Promise<string> {
        try {
            // Create temp directory if it doesn't exist
            if (!fs.existsSync(this.TEMP_DIR)) {
                fs.mkdirSync(this.TEMP_DIR, { recursive: true });
            }

            const repoDir = path.join(this.TEMP_DIR, `${owner}-${repo}`);
            
            // Remove existing directory if it exists
            if (fs.existsSync(repoDir)) {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }

            // Clone the repository
            const cloneUrl = `https://github.com/${owner}/${repo}.git`;
            log.info(`Cloning repository from ${cloneUrl}`);
            
            await execAsync(`git clone --depth 1 --branch ${branch} ${cloneUrl} ${repoDir}`);
            
            log.info(`Successfully cloned repository to ${repoDir}`);
            return repoDir;
        } catch (error) {
            log.error('Error cloning repository:', error);
            throw new Error(`Failed to clone repository ${owner}/${repo}: ${error}`);
        }
    }

    static async downloadNpmPackage(packageName: string): Promise<string> {
        try {
            // Create temp directory if it doesn't exist
            if (!fs.existsSync(this.TEMP_DIR)) {
                fs.mkdirSync(this.TEMP_DIR, { recursive: true });
            }

            const packageDir = path.join(this.TEMP_DIR, packageName);
            
            // Remove existing directory if it exists
            if (fs.existsSync(packageDir)) {
                fs.rmSync(packageDir, { recursive: true, force: true });
            }

            // Create package directory
            fs.mkdirSync(packageDir);

            // Initialize npm package and install the target package
            log.info(`Downloading npm package ${packageName}`);
            await execAsync('npm init -y', { cwd: packageDir });
            await execAsync(`npm install ${packageName}`, { cwd: packageDir });
            
            log.info(`Successfully downloaded package to ${packageDir}`);
            return packageDir;
        } catch (error) {
            log.error('Error downloading npm package:', error);
            throw new Error(`Failed to download npm package ${packageName}: ${error}`);
        }
    }

    static async cleanupPackage(packagePath: string): Promise<void> {
        try {
            if (fs.existsSync(packagePath)) {
                fs.rmSync(packagePath, { recursive: true, force: true });
                log.info(`Cleaned up package directory: ${packagePath}`);
            }
        } catch (error) {
            log.error('Error cleaning up package:', error);
            throw error;
        }
    }
}