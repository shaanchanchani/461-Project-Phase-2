# Package Registry System

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

## Project Status

### Baseline Functionality Status

#### 1. Package Search (POST /packages) - 0% Complete
**Backend:**
- ❌ Search endpoint structure defined
- ❌ RegEx search implementation
- ❌ Pagination support with offset
- ❌ Response format with metadata

**Frontend:**
- ✅ Basic search UI implemented
- ✅ Search input field with RegEx support
- ❌ Results pagination
- ❌ Advanced filtering options

#### 2. Package Creation (POST /package) - 95% Complete
**Backend:**
- ✅ Package creation endpoint
- ✅ URL and file upload support
- ✅ GitHub repository cloning
- ✅ NPM package download
- ❌ Content validation
- ❌ Package rating disqualification

**Frontend:**
- ✅ Upload form with URL/file options
- ✅ Form validation
- ✅ Progress indicators
- ✅ Error handling
- ❌ Package size validation

#### 3. Package Retrieval (GET /package/{id}) - 95% Complete
**Backend:**
- ✅ Package retrieval from DynamoDB
- ✅ Error handling for missing packages
- ✅ Proper response format

**Frontend:**
- ✅ Package details view
- ✅ Metadata display
- ❌ Download functionality
- ❌ Version history display

#### 4. Package Update (PUT /package/{id}) - 0% Complete
**Backend:**
- ❌ Update endpoint defined
- ❌ Version management
- ❌ Content validation

**Frontend:**
- ❌ Update interface
- ❌ Version selection
- ❌ Change preview
- ❌ Update confirmation

#### 5. Package Delete (DELETE /package/{id}) - 0% Complete
**Backend:**
- ❌ Deletion endpoint
- ❌ Permission verification
- ❌ Reference cleanup

**Frontend:**
- ❌ Delete confirmation dialog
- ❌ Success/error notifications
- ❌ List refresh after deletion

#### 6. Registry Reset (DELETE /reset) - 100% Complete
**Backend:**
- ✅ Reset endpoint implemented
- ✅ Admin permission check
- ✅ Database cleanup

### Critical TODOs

1. Backend Priorities
   - Implement search functionality with RegEx support
   - Complete package update/delete operations
   - Add content validation for package uploads
   - Implement rate limiting

2. Frontend Priorities
   - Complete search results display
   - Add pagination controls
   - Implement package update interface
   - Add delete confirmation flow

3. Testing
   - Add comprehensive API tests
   - Implement frontend unit tests
   - Add integration tests
   - Set up CI/CD pipeline

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
