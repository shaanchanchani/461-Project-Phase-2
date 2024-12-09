# API Endpoint Limitations Documentation

## Package Upload and Creation (`/package` POST)
### URL Limitations
- Only accepts the following URL formats:
  - GitHub: `github.com/owner/repo` or `github.com/owner/repo/tree/version`
  - npm: `npmjs.com/package/name`
- npm scoped packages may have inconsistent behavior

### Package Content Limitations
- Dependencies are not downloaded or validated during package upload
- Package dependencies are not stored or tracked
- No validation of package.json dependency specifications
- No resolution of dependency version conflicts

## Package Cost Calculation (`/package/{id}/cost` GET)
### Cost Calculation Limitations
- `totalCost` always equals `standaloneCost`
- When `dependency=true`:
  - Only returns the standalone package size
  - Does not calculate or include dependency sizes
  - No recursive dependency resolution
  - May report inaccurate total costs

## Package Metrics (`/package/{id}/rate` GET)
### Metric Calculation Limitations
- All metric calculations are always performed on the most recent version of the package, regardless of which version is requested
- Metric calculations may be inaccurate due to parsing errors
- No caching of metric calculations
- No version-specific metric history

## Package Update (`/package/{id}` POST)
### Version Management Limitations
- Version comparison and validation is limited
- No semantic versioning enforcement
- Updates are allowed regardless of version numbers (does not enforce version increments)
- No dependency version constraint validation

## Package Retrieval (`/package/{id}` GET)
### Content Retrieval Limitations
- Does not retrieve or include dependency information
- No support for partial package downloads
- No support for specific version downloads of npm packages

## Package Search (`/package/byRegEx` POST & `/packages` POST)
### Search Limitations
- Search is limited to exact package names abd regex matches
- No full-text search capability
- No search within package descriptions or READMEs
- RegEx search may have performance limitations on large datasets

## General Limitations
1. **Storage**
   - No package deduplication
   - No garbage collection of unused versions
   - No size limits enforcement on package storage

2. **Security**
   - Limited package validation
   - No malware scanning
   - No signature verification
   - No package integrity checks

3. **Performance**
   - No rate limiting
   - No request throttling

4. **Dependencies**
   - No dependency tree resolution
   - No circular dependency detection
   - No vulnerability checking in dependencies
   - No automated dependency updates
