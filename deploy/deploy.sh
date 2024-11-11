#!/bin/bash
set -e
cd ~/app   

# Create environment file if it doesn't exist
cat > .env << EOF
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_REGION=us-east-1
DYNAMODB_TABLE=packages
EOF

# Make run executable and install dependencies
chmod +x run 
./run install

# Start or restart the application with environment variables
source .env
./run start

echo "- ./run test         # To run tests"
echo "- ./run url_github   # To score a repository"
