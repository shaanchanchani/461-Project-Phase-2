import AdmZip from 'adm-zip';
import { log } from '../logger';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { glob } from 'glob';

export class DebloatService {
    private readonly TEMP_DIR = path.join(os.tmpdir(), 'package-debloat');

    /**
     * Debloat a package by removing unnecessary files and dependencies
     * @param zipBuffer The original package zip buffer
     * @returns Buffer The debloated package zip buffer
     */
    public async debloatPackage(zipBuffer: Buffer): Promise<Buffer> {
        const tempDir = await this.createTempDir();
        try {
            // Extract zip to temp directory
            const zip = new AdmZip(zipBuffer);
            zip.extractAllTo(tempDir, true);

            // Perform debloating steps
            await this.removeDevDependencies(tempDir);
            await this.removeUnnecessaryFiles(tempDir);
            await this.optimizeNodeModules(tempDir);

            // Create new zip with debloated content
            const newZip = new AdmZip();
            const files = this.getAllFiles(tempDir);
            for (const file of files) {
                const relativePath = path.relative(tempDir, file);
                newZip.addLocalFile(file, path.dirname(relativePath));
            }

            return newZip.toBuffer();
        } finally {
            // Cleanup
            await this.cleanupTempDir(tempDir);
        }
    }

    private async createTempDir(): Promise<string> {
        const tempDir = path.join(this.TEMP_DIR, `${Date.now()}-${Math.random().toString(36).substring(7)}`);
        await fs.promises.mkdir(tempDir, { recursive: true });
        return tempDir;
    }

    private async cleanupTempDir(tempDir: string): Promise<void> {
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
            log.error('Error cleaning up temp directory:', error);
        }
    }

    private async removeDevDependencies(packageDir: string): Promise<void> {
        const packageJsonPath = path.join(packageDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) return;

        try {
            // Remove devDependencies from package.json
            const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));
            delete packageJson.devDependencies;
            await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

            // If node_modules exists, remove dev dependencies
            const nodeModulesPath = path.join(packageDir, 'node_modules');
            if (fs.existsSync(nodeModulesPath)) {
                execSync('npm prune --production', { cwd: packageDir });
            }
        } catch (error) {
            log.error('Error removing dev dependencies:', error);
        }
    }

    private async removeUnnecessaryFiles(packageDir: string): Promise<void> {
        const unnecessaryPatterns = [
            '**/*.test.js', '**/*.spec.js', '**/*.test.ts', '**/*.spec.ts',
            '**/test/**', '**/tests/**', '**/__tests__/**',
            '**/docs/**', '**/doc/**', '**/example/**', '**/examples/**',
            '**/.git/**', '**/.github/**', '**/.gitlab/**',
            '**/.vscode/**', '**/.idea/**',
            '**/coverage/**', '**/dist/**', '**/build/**',
            '**/*.md', '**/*.txt', '**/*.log',
            '**/LICENSE', '**/LICENSE.*', '**/CHANGELOG.*', '**/CONTRIBUTING.*'
        ];

        for (const pattern of unnecessaryPatterns) {
            try {
                const files = await this.findFiles(packageDir, pattern);
                for (const file of files) {
                    await fs.promises.rm(file, { recursive: true, force: true });
                }
            } catch (error) {
                log.error(`Error removing files matching pattern ${pattern}:`, error);
            }
        }
    }

    private async optimizeNodeModules(packageDir: string): Promise<void> {
        const nodeModulesPath = path.join(packageDir, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) return;

        try {
            // Remove unnecessary files from node_modules
            await this.removeUnnecessaryFiles(nodeModulesPath);
        } catch (error) {
            log.error('Error optimizing node_modules:', error);
        }
    }

    private getAllFiles(dir: string): string[] {
        const files: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...this.getAllFiles(fullPath));
            } else {
                files.push(fullPath);
            }
        }

        return files;
    }

    private async findFiles(dir: string, pattern: string): Promise<string[]> {
        try {
            const matches = await glob(pattern, { 
                cwd: dir, 
                absolute: true,
                dot: true // Include dotfiles
            });
            return matches;
        } catch (error) {
            log.error('Error finding files:', error);
            return [];
        }
    }
}

export const debloatService = new DebloatService();
