# Branch Planning for Remaining Test Cases

## Current Test Status Summary
- Package Read: 6/15 passing
- Package Cost: 2/3 passing (3 hidden)
- Rate Packages: 14/22 passing (1 hidden)
- Regex Tests: 1/6 passing (3 hidden)
- Setup/Reset: 2/5 passing
- Update Package: 1/9 passing (9 hidden)
- Upload Packages: 6/9 passing

## Proposed Branches

### 1. package-read-branch (HIGH PRIORITY)
Focus: `searchService.ts`
Current Status: Skeleton implementation only
Implementation Needs:
- Implement `listPackages()` with pagination support
- Implement `searchByName()` for exact name matching
- Implement `getPackageById()` with proper error handling
Tests to fix:
- Get Package By Name tests (0/7 passing)
- Invalid Package Read Test
- Get Package By ID Test Package 2

### 2. regex-implementation-branch (HIGH PRIORITY)
Focus: `searchService.ts`, `packageUploadService.ts`
Current Status: Skeleton implementation only
Implementation Needs:
- Implement `searchByRegEx()` with proper pattern validation
- Implement `exactMatchName()` for precise name validation
- Implement `extraCharsMatch()` for flexible name matching
Tests to fix:
- Exact Match Name Regex Test
- Extra Chars Name Regex Test
- Hidden regex tests

### 3. setup-reset-branch (MEDIUM PRIORITY)
Focus: `resetService.ts`
Current Status: Basic implementation complete
Implementation Needs:
- Verify S3 bucket clearing functionality
- Ensure proper DynamoDB table reset
- Validate admin user restoration
Tests to fix:
- Check No Packages after Reset
- Remaining setup/reset tests

### 4. package-update-branch
Focus: `packageUpdateService.ts`
Tests to fix:
- All update package tests (1/9 passing)
- Hidden update tests

### 5. upload-package-branch
Focus: `packageUploadService.ts`
Tests to fix:
- Get Package Query Test
- Upload Content package 3
- Any remaining upload tests

### 6. rating-completion-branch
Focus: `ratingService.ts`
Tests to fix:
- Get Package Rate Test Package 2
- Remaining hidden rating tests

### 7. package-cost-branch
Focus: `costService.ts`
Tests to fix:
- Remaining cost calculation tests
- Hidden cost tests

## Branch Order Priority
1. package-read-branch (foundational functionality)
2. regex-implementation-branch (affects search and upload)
3. setup-reset-branch (affects test isolation)
4. package-update-branch
5. upload-package-branch
6. rating-completion-branch
7. package-cost-branch

## Guidelines
- Each branch should be created from main
- Keep changes focused on specific service files to minimize merge conflicts
- Test thoroughly before merging back to main
- Update branch when main changes to prevent conflicts
