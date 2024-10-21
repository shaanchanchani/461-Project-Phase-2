#!/bin/bash

# Update the repository and install dependencies
cd /path/to/your/project
git pull origin main
npm install

# Restart your service (example with pm2)
pm2 restart your-app-name
