## Setup Instructions

1. Update `.env` 

2. If u don't already have docker
   - Windows: https://docs.docker.com/desktop/setup/install/windows-install/
   - Mac: `brew install --cask docker` 

3. In the project directory:
```bash
# Install dependencies
npm install

# Build TypeScript
npx tsc

# Start DynamoDB containers
docker-compose up -d

# Initialize database
# this runs the setup-local.ts file 
npm run setup

# Start server
./run

# Open DB gui (server is running on http://localhost:3000)
open http://localhost:8001
```


### Authentication
```bash
# Get auth token
curl -X PUT http://localhost:3000/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "User": {
      "name": "admin",
      "isAdmin": true
    },
    "Secret": {
      "password": ""
    }
  }'
```
```bash
   # Use the returned token for other requests
   curl -H "X-Authorization: bearer <token>" 
```

## Status

### Completed Endpoints
✅ `PUT /authenticate`

✅ `DELETE /reset`
- W/ admin perm check
- Clears DB

✅ `GET /package/{id}`
- Basic package retrieval from DynamoDB
- Proper error handling for missing packages

### Partially Implemented
🟨 `POST /package`
- Basic structure implemented
- Missing: Content validation, debloat functionality, S3 functionality 
- TODO: Implement package validation and rating disqualification (424 response)

🟨 `GET /package/{id}/rate`
- Most of this is already done, just need to link the get net score to the API route

### Not Yet Implemented
❌ `POST /packages`
- Endpoint defined but listPackages not implemented
- Needs pagination support with offset

❌ `POST /package/byRegEx`
- Endpoint defined but search functionality not implemented
- Needs regex validation

❌ `GET /package/{id}/cost`
- Endpoint defined
- Needs implementation of cost calculation
- Needs dependency traversal support

❌ `PUT /package/{id}`
- Endpoint defined
- Update functionality not implemented
- Version management needed