# Package Registry System

## Overview
A robust package registry system built with TypeScript, Express.js, and React. This system provides comprehensive package management capabilities with advanced search features and reliable metrics calculation.

## Features
- 🔍 Advanced package search with version constraints
- 📦 Secure package upload and storage
- 📊 Comprehensive package metrics
- 💾 DynamoDB integration for reliable data storage
- 🌐 Modern React-based frontend

## Technology Stack
### Backend
- **Runtime**: TypeScript, Express.js
- **Database**: AWS DynamoDB
- **Storage**: AWS S3
- **Testing**: Jest

### Frontend
- **Framework**: React
- **Styling**: Tailwind CSS
- **State Management**: React Context
- **API Client**: Axios

## Accessing the Application

### Production Endpoints
- **Frontend**: [https://5173-01jdswgvp5v0yssm5cv98hhykt.cloudspaces.litng.ai/login](https://5173-01jdswgvp5v0yssm5cv98hhykt.cloudspaces.litng.ai/login)
- **API**: [https://3000-01jdswgvp5v0yssm5cv98hhykt.cloudspaces.litng.ai](https://3000-01jdswgvp5v0yssm5cv98hhykt.cloudspaces.litng.ai)

## API Documentation

### Package Operations

#### Search Packages
```http
POST /api/packages/search
Content-Type: application/json

{
  "Name": "package-name",
  "Version": "^1.0.0"
}
```

#### Upload Package
```http
POST /api/package
Content-Type: application/json

{
  "URL": "https://github.com/username/repo"
}
```

#### Get Package
```http
GET /api/package/:id
```

#### Reset Registry
```http
DELETE /api/reset
```

## Data Flow

### Search Flow
1. User enters search criteria
2. Frontend sends POST request to `/api/packages/search`
3. Backend processes search against DynamoDB
4. Results displayed in frontend grid

### Upload Flow
1. User submits package URL
2. Backend clones/downloads package content
3. Metrics are calculated
4. Package is stored in S3
5. Metadata stored in DynamoDB

### Download Flow
1. User requests package download
2. Backend generates S3 presigned URL
3. Browser handles file download

## Team
- Shaan Chanchani
- Alex Pienkowski
- Niki Vakil
- Aryana Lynch

## Project Status

### Baseline Functionality Status

#### 1. Package Search (POST /packages) - 100% Complete
**Backend:**
- ✅ Search endpoint structure defined
- ✅ RegEx search implementation with semver support
- ✅ Pagination support with offset
- ✅ Response format with metadata
- ✅ Advanced version constraint matching

**Frontend:**
- ✅ Basic search UI implemented
- ✅ Search input field with RegEx support
- ✅ Results display with package details
- ✅ Results pagination
- ✅ Advanced filtering options

#### 2. Package Management - 100% Complete
**Backend:**
- ✅ Package creation endpoint
- ✅ URL and file upload support
- ✅ GitHub repository cloning
- ✅ NPM package download
- ✅ Content validation
- ✅ Package metrics calculation
- ✅ Version management
- ✅ Package updates and deletion

**Frontend:**
- ✅ Upload form with URL/file options
- ✅ Form validation
- ✅ Package display and management
- ✅ Version history view
- ✅ Delete confirmation dialog

#### 3. Authentication & Security - 100% Complete
- ✅ JWT-based authentication
- ✅ Role-based access control
- ✅ Input validation
- ✅ Error handling
- ✅ Secure credential management

#### 4. Database & Storage - 100% Complete
- ✅ DynamoDB integration
- ✅ S3 storage setup
- ✅ Data persistence
- ✅ Version tracking
- ✅ Metrics storage

### Next Steps
1. Performance Optimization
   - Implement caching for frequent searches
   - Optimize database queries
   - Add rate limiting

2. Enhanced Features
   - Add advanced metric visualizations
   - Implement package dependency tracking
   - Add user activity logging

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
