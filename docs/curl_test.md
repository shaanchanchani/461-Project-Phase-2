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
- NPM package: `npmjs.com/package/name`  <-- no support for NPM package with version yet!


This will attempt to upload the package to the registry. The response will indicate if the upload was successful or if there were any errors (e.g., if the package already exists).
