#!/bin/bash
set -e
cd ~/app   

# Ensure log file exists
touch "$LOG_FILE"

# install dependencies
chmod +x run 
./run install
echo "- ./run test         # To run tests"
echo "- ./run url_github   # To score a repository"
