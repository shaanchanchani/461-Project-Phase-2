#!/bin/bash

set -e

cd ~/app   

#install dependencies
chmod +x run 

./run install

echo "- ./run test         # To run tests"
echo "- ./run url_github   # To score a repository"
