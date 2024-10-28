#!/bin/bash

# Exit on any error
set -e

echo "Starting deployment process..."

# Create application directory if it doesn't exist
APP_DIR=~/app
mkdir -p $APP_DIR
cd $APP_DIR

# Create logs directory if it doesn't exist
mkdir -p logs
touch logs/app.log

# Stop existing application if running
if command -v pm2 &> /dev/null; then
    echo "Stopping existing PM2 processes..."
    pm2 stop app || true
    pm2 delete app || true
else
    echo "Installing PM2..."
    npm install -g pm2
fi

# Install dependencies
echo "Installing dependencies..."
npm install --production


# Ensure correct permissions
echo "Setting permissions..."
chmod -R 755 $APP_DIR

# Start application with PM2
echo "Starting application..."
pm2 start dist/index.js --name app \
    --max-memory-restart 300M \
    --log logs/pm2.log

# Save PM2 process list
pm2 save

# Setup PM2 to start on server reboot
pm2 startup

echo "Deployment completed successfully!"

# Print application status
echo "Application Status:"
pm2 list
pm2 logs app --lines 10
