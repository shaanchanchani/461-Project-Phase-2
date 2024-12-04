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

```bash
curl -X POST http://localhost:3000/package \
  -H "Content-Type: application/json" \
  -H "X-Authorization: <bearer_token>" \
  -d '{
    "URL": "https://github.com/expressjs/express",
    "JSProgram": "console.log('\''test'\'')"
  }'
```

This will attempt to upload the Express.js package to the registry. The response will indicate if the upload was successful or if there were any errors (e.g., if the package already exists).
