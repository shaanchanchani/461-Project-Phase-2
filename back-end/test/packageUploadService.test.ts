import { PackageUploadService } from '../src/services/packageUploadService';
import AdmZip from 'adm-zip';

jest.mock('axios');

describe('PackageUploadService', () => {
    let service: PackageUploadService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new PackageUploadService();
    });

    describe('findPackageJson', () => {
        it('should find package.json in root directory', () => {
            const zip = new AdmZip();
            zip.addFile('package.json', Buffer.from(JSON.stringify({ name: 'test' })));
            
            const result = service.findPackageJson(zip);
            expect(result).toBeDefined();
            expect(JSON.parse(result!.getData().toString())).toEqual({ name: 'test' });
        });

        it('should find package.json one level down', () => {
            const zip = new AdmZip();
            zip.addFile('package-name/package.json', Buffer.from(JSON.stringify({ name: 'test' })));
            
            const result = service.findPackageJson(zip);
            expect(result).toBeDefined();
            expect(JSON.parse(result!.getData().toString())).toEqual({ name: 'test' });
        });

        it('should return null when no package.json found', () => {
            const zip = new AdmZip();
            zip.addFile('readme.md', Buffer.from('# Test'));
            
            const result = service.findPackageJson(zip);
            expect(result).toBeNull();
        });
    });

    describe('sanitizeUrl', () => {
        it('should convert git protocol to https', () => {
            const result = service['sanitizeUrl']('git://github.com/user/repo');
            expect(result).toBe('https://github.com/user/repo');
        });

        it('should remove git+ prefix', () => {
            const result = service['sanitizeUrl']('git+https://github.com/user/repo');
            expect(result).toBe('https://github.com/user/repo');
        });

        it('should remove .git suffix', () => {
            const result = service['sanitizeUrl']('https://github.com/user/repo.git');
            expect(result).toBe('https://github.com/user/repo');
        });

        it('should handle empty input', () => {
            const result = service['sanitizeUrl']('');
            expect(result).toBe('');
        });
    });

    describe('isValidGithubOrNpmUrl', () => {
        it('should validate github.com URLs', () => {
            expect(service['isValidGithubOrNpmUrl']('https://github.com/user/repo')).toBe(true);
        });

        it('should validate npmjs.com URLs', () => {
            expect(service['isValidGithubOrNpmUrl']('https://www.npmjs.com/package/name')).toBe(true);
        });

        it('should reject invalid URLs', () => {
            expect(service['isValidGithubOrNpmUrl']('https://invalid.com/repo')).toBe(false);
        });

        it('should reject malformed URLs', () => {
            expect(service['isValidGithubOrNpmUrl']('not-a-url')).toBe(false);
        });
    });

    describe('validateUrl', () => {
        it('should accept valid GitHub URLs', () => {
            expect(() => {
                service['validateUrl']('https://github.com/owner/repo');
            }).not.toThrow();
        });

        it('should accept valid GitHub URLs with version', () => {
            expect(() => {
                service['validateUrl']('https://github.com/owner/repo/tree/v1.0.0');
            }).not.toThrow();
        });

        it('should throw error for invalid URL format', () => {
            expect(() => {
                service['validateUrl']('not-a-url');
            }).toThrow('Invalid URL');
        });

        it('should throw error for non-GitHub/npm URLs', () => {
            expect(() => {
                service['validateUrl']('https://gitlab.com/owner/repo');
            }).toThrow('Invalid URL format. Please use one of these formats:');
        });
    });

    describe('isNewerVersion', () => {
        it('should correctly compare version numbers', () => {
            expect(service['isNewerVersion']('1.0.1', '1.0.0')).toBe(true);
            expect(service['isNewerVersion']('1.1.0', '1.0.0')).toBe(true);
            expect(service['isNewerVersion']('2.0.0', '1.9.9')).toBe(true);
            expect(service['isNewerVersion']('1.0.0', '1.0.0')).toBe(false);
            expect(service['isNewerVersion']('1.0.0', '1.0.1')).toBe(false);
        });
    });
});