# API Authentication Test Commands
make sure backend is running
## Get Bearer Token
To get a bearer token for API authentication, use the following curl command:

```bash
curl -X PUT http://localhost:3000/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "User": {
      "name": "admin",
      "isAdmin": true
    },
    "Secret": {
      "password": "balls"
    }
  }'
```

This will return a bearer token that can be used for subsequent API requests. The token should be included in the `X-Authorization` header for all authenticated endpoints.

Example response:
```json
"bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Using the Bearer Token
For subsequent API requests, include the token in the `X-Authorization` header:

```bash
curl -H "X-Authorization: <bearer_token>" http://localhost:3000/package/{id}
```

Replace `<bearer_token>` with the actual token received from the authentication request.

## Upload a Package
To upload a package using a GitHub URL, use the following curl command:

### Standard GitHub URL
```bash
curl -X POST http://localhost:3000/package \
  -H "Content-Type: application/json" \
  -H "X-Authorization: <bearer_token>" \
  -d '{
    "URL": "https://github.com/expressjs/express",
    "JSProgram": "console.log('\''test'\'')"
  }'
```

### GitHub URL with Specific Version
```bash
curl -X POST http://localhost:3000/package \
  -H "Content-Type: application/json" \
  -H "X-Authorization: <bearer_token>" \
  -d '{
    "URL": "https://github.com/chalk/chalk/tree/v5.3.0",
    "JSProgram": "console.log('\''test'\'')"
  }'
```

### Upload a Package from a ZIP File
To upload a package directly from a ZIP file, use the following curl command:

```bash
curl -X POST http://localhost:3000/package \
  -H "Content-Type: application/json" \
  -H "X-Authorization: <bearer_token>" \
  -d '{
    "Content": "<base64_encoded_zip_content>",
    "JSProgram": "console.log('\''test'\'')",
    "debloat": false
  }'
```

#### Requirements for ZIP Upload
- The ZIP must contain a valid `package.json` file at the root of the archive
- The `package.json` should include a `repository` or `homepage` URL
- The package must not already exist in the registry

#### Example Workflow
1. Prepare your package as a ZIP file
2. Base64 encode the ZIP content (your application will handle this)
3. Include the base64-encoded content in the `Content` field
4. Optionally provide a `JSProgram` and set `debloat` flag

**Note**: 
- The package will be analyzed for metrics using the URL found in `package.json`
- If no repository URL is found, the upload will fail
- The package will be checked against existing packages to prevent duplicates

The URL can be in one of these formats:
- Standard GitHub repository: `github.com/owner/repo`
- GitHub repository with version: `github.com/owner/repo/tree/version`
- NPM package: `npmjs.com/package/name` 


This will attempt to upload the package to the registry. The response will indicate if the upload was successful or if there were any errors (e.g., if the package already exists).

## Download a Package
To download a package using its ID, use the following curl command:

```bash
curl -X GET "http://localhost:3000/package/{package_id}" \
  -H "X-Authorization: <bearer_token>"
```

Example with actual values:
```bash
curl -X GET "http://localhost:3000/package/683a15ac-822b-4246-836a-b071369117f6" \
  -H "X-Authorization: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiYWRtaW4iLCJpc0FkbWluIjp0cnVlLCJpYXQiOjE3MzMzNTk1MDMsImV4cCI6MTczMzQ0NTkwM30.k6kwq73nMW3cK5IjveHB0094h-GBjVDQqywwseJfXLI"
```

Expected response format:
```json
{
  "metadata": {
    "Name": "package-name",
    "Version": "x.y.z",
    "ID": "package-uuid"
  },
  "data": {
    "Content": "base64-encoded-content",
    "JSProgram": "console.log(\"test\")"
  }
}
```

Replace `{package_id}` with the actual package ID received from the upload response, and `<bearer_token>` with your authentication token.

## Cost Package

Test the cost endpoint functionality for retrieving package costs.

### 1. Get Package Cost (Standalone)

```bash
curl -X GET "http://localhost:3000/package/[PACKAGE_ID]/cost" \
     -H "X-Authorization: Bearer [YOUR_TOKEN]"
```

Expected successful response (200):
```json
{
    "[PACKAGE_ID]": {
        "standaloneCost": 1.5,
        "totalCost": 1.5
    }
}
```

### 2. Get Package Cost with Dependencies

```bash
curl -X GET "http://localhost:3000/package/[PACKAGE_ID]/cost?includeDependencies=true" \
     -H "X-Authorization: Bearer [YOUR_TOKEN]"
```

Expected successful response (200):
```json
{
    "[PACKAGE_ID]": {
        "standaloneCost": 1.5,
        "totalCost": 2.5
    }
}
```

### Error Cases

1. Package Not Found (404):
```bash
curl -X GET "http://localhost:3000/package/nonexistent-package/cost" \
     -H "X-Authorization: Bearer [YOUR_TOKEN]"
```

Response:
```json
{
    "error": "Package not found"
}
```

2. Invalid Authentication (401):
```bash
curl -X GET "http://localhost:3000/package/[PACKAGE_ID]/cost" \
     -H "X-Authorization: Bearer invalid-token"
```

Response:
```json
{
    "error": "Invalid authentication token"
}
```

3. Missing Package ID (400):
```bash
curl -X GET "http://localhost:3000/package//cost" \
     -H "X-Authorization: Bearer [YOUR_TOKEN]"
```

Response:
```json
{
    "error": "Package ID is required"
}
```

### Notes

- All costs are returned in megabytes (MB)
- The `includeDependencies` query parameter is optional and defaults to `false`
- Standalone cost represents the size of the package itself
- Total cost includes the size of dependencies when `includeDependencies` is `true`
- Authentication via Bearer token is required for all requests

## Reset Registry
To reset the package registry to its default state, use the following curl command:

```bash
curl -X DELETE http://localhost:3000/reset \
  -H "X-Authorization: <bearer_token>"
```

### Important Notes
- This endpoint requires admin privileges. Make sure to use a bearer token for an admin user.
- This operation will clear all packages from the registry.
- This is a destructive operation and cannot be undone.

### Example Responses

#### Successful Reset
```json
{
    "status": "success",
    "message": "Registry reset to default state"
}
```

#### Error Responses

Unauthorized (No token):
```json
{
    "error": "Unauthorized",
    "message": "Authentication required"
}
```

Forbidden (Non-admin user):
```json
{
    "error": "Forbidden",
    "message": "Only administrators can reset the registry"
}
```

Storage Error:
```json
{
    "error": "Storage Error",
    "message": "Failed to clear package storage"
}
```

Database Error:
```json
{
    "error": "Database Error",
    "message": "Failed to reset database state"
}
```

Timeout Error:
```json
{
    "error": "Timeout Error",
    "message": "Operation timed out while resetting registry"
}
