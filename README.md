# Package Registry System

## Overview
A robust package registry system built with TypeScript, Express.js, and AWS services. This system provides comprehensive package management capabilities with advanced search features, secure authentication, and reliable metrics calculation.

## Features
- 🔍 Advanced package search with version constraints
- 📦 Secure package upload and storage
- 🔐 JWT-based authentication
- 📊 Comprehensive package metrics
- 🔄 Automated CI/CD pipeline
- 💾 DynamoDB integration for reliable data storage

## Technology Stack
- **Backend**: TypeScript, Express.js
- **Database**: AWS DynamoDB
- **Storage**: AWS S3
- **Authentication**: JWT
- **Testing**: Jest
- **CI/CD**: GitHub Actions

## Prerequisites
- Node.js (v20.x)
- Docker
- AWS Account (for production deployment)
- npm/yarn

## Local Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd 461-Project-Phase-2
```

2. Install Docker if not already installed:
   - Windows: [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
   - Mac: `brew install --cask docker`

3. Configure environment:
```bash
cp .env.example .env
# Update .env with your configuration
```

4. Install dependencies and build:
```bash
npm install
npx tsc
```

5. Start local services:
```bash
# Start DynamoDB containers
docker-compose up -d

# Initialize database
npm run setup

# Start server
./run
```

6. Access local services:
- API Server: http://localhost:3000
- DynamoDB Admin: http://localhost:8001

## Testing
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- <test-file-name>
```

## API Documentation

### Package Operations
- `POST /packages`: Search packages with version constraints
- `POST /package`: Upload new package
- `GET /package/:id`: Get package by ID
- `DELETE /package/:id`: Delete package

### Authentication
- `POST /authenticate`: Get authentication token

## Deployment

The system uses GitHub Actions for CI/CD, automatically deploying to AWS EC2 when pushing to main branch.

### Manual Deployment
1. Configure AWS credentials
2. Build the project: `npm run build`
3. Deploy using provided script: `./deploy.sh`

## Security Features
- Input validation
- CORS protection
- Secure credential management

## Monitoring and Logging
- Comprehensive error logging
- Performance metrics tracking
- AWS CloudWatch integration

## Contributing
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Create Pull Request

## License
MIT

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


