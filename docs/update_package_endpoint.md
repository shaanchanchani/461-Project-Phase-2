# Update Package Endpoint Documentation

## Endpoint: /package/{id}
**Method:** POST

## Description
Creates a new version entry for an existing package. Only accepts updates when the requested version is newer than the current latest_version. While the package's version history is maintained in the database, only the latest version content is stored in S3.

Key behaviors:
- Only updates `latest_version` reference in main package table
- Creates new entries in versions and metrics tables
- Maintains package history without modifying existing versions
- Enforces semver versioning (e.g., 1.2.3 → 1.2.4 or 1.3.0)
- Rejects updates if new version ≤ current latest_version
- Handles either direct content upload (base64) or URL ingestion

Example version flow:
```
Initial: package v1.0.0 (latest_version)
Update to v0.9.0 → Rejected (older version)
Update to v1.0.0 → Rejected (same version)
Update to v1.1.0 → Accepted (newer version)
Result: v1.1.0 becomes latest_version
```
## S3 Storage Limitation
**Current Implementation Note:** Package content is stored in S3 at `packages/${packageId}/content.zip`, which means newer versions overwrite previous version content.

To fully support version history, future updates should:
1. Modify S3 storage path to: `packages/${packageId}/${version}/content.zip`
2. Maintain separate zip files for each version
3. Enable retrieval of specific version content

## Storage Structure
Current:
```
s3://bucket/
  └── packages/
      └── {packageId}/
          └── content.zip  (latest version only)
```

## Database Interactions
1. **Package Table**
   - Only updates `latest_version` field if new version is more recent
   - Does not modify other package metadata

2. **Versions Table**
   - Creates new version entry
   - Stores package content and metadata
   - Links to parent package ID

3. **Metrics Table**
   - Creates new metrics entry for the version
   - Associates with new version ID

## Request Validation
1. Package must exist (404 if not found)
2. Content validation:
   - Either URL or Content required (not both)
   - Base64 encoded content or valid repository URL
3. Version validation:
   - Must be newer than current latest_version
   - Must follow semver format

## Request Format

### 1. Zip Upload Request
```json
{
  "metadata": {
    "Name": "package-name",
    "Version": "1.2.0",
    "ID": "package-123"
  },
  "data": {
    "Content": "base64-encoded-zip-content",
    "JSProgram": "optional-js-program"
  }
}
```
- Content must be Base64 encoded zip file
- Zip must contain valid package.json
- Content size limited to []MB

### 2. URL-Based Request
```json
{
  "metadata": {
    "Name": "package-name",
    "Version": "1.2.0",
    "ID": "package-123"
  },
  "data": {
    "URL": "https://github.com/owner/repo",
    "JSProgram": "optional-js-program"
  }
}
```

## Response Format
### Success (200 OK)
```json
{
  "metadata": {
    "Name": "package-name",
    "Version": "1.2.0",
    "ID": "package-123"
  },
  "data": {
    "Content": "base64-encoded-content",
    "JSProgram": "provided-js-program"
  }
}
```

### Error Responses
- **400**: `{ "error": "Invalid request format or version" }`
- **403**: `{ "error": "Authentication failed" }`
- **404**: `{ "error": "Package not found" }`

## Response Codes
- **200**: Version added successfully
- **400**: Invalid request format or version
- **403**: Authentication failed
- **404**: Package not found

## Implementation Flow
1. Validate authentication token
2. Check package exists
3. Validate request format
4. Process content (URL fetch or decode base64)
5. Verify version is newer
6. Create version entry
7. Update package latest_version
8. Generate and store metrics


