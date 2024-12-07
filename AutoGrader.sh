#!/bin/bash

# Base URL for the API
BASE_URL="http://dl-berlin.ecn.purdue.edu:8000"

# Hardcoded values for the script
GROUP_NUMBER=7  # Replace with your actual group number
GITHUB_URL="https://github.com/shaanchanchani/461-Project-Phase-2" 
TEAM_NAMES='["Shaan Chanchani", "Alex Pienkowski", "nikivakil", "arylynch"]'
API_ENDPOINT="https://3000-01jdswgvp5v0yssm5cv98hhykt.cloudspaces.litng.ai"
FE_ENDPOINT="https://5173-01jdswgvp5v0yssm5cv98hhykt.cloudspaces.litng.ai/login"
# echo setup
# echo "BASE_URL: $BASE_URL"
# echo "GROUP_NUMBER: $GROUP_NUMBER"
# echo "GITHUB_URL: $GITHUB_URL"
# echo "TEAM_NAMES: $TEAM_NAMES"
# echo "API_ENDPOINT: $API_ENDPOINT"
# echo "FE_ENDPOINT: $FE_ENDPOINT"

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo ".env file not found. Please create one with the GITHUB_TOKEN variable."
  exit 1
fi

if [[ -z "$AUTOGRADER_TOKEN" ]]; then
  echo "AUTOGRADER_TOKEN is not set in the .env file."
  exit 1
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
  mkdir -p logs
fi

# Function to get timestamp for log files
get_log_timestamp() {
  date +"%Y%m%d_%H%M%S"
}

# Function to register
register() {
  echo "Registering ..."
  
  DATA='{
    "group": '"$GROUP_NUMBER"',
    "github": "'"$GITHUB_URL"'",
    "names": '"$TEAM_NAMES"',
    "gh_token": "'"$AUTOGRADER_TOKEN"'",
    "endpoint": "'"$API_ENDPOINT"'",
    "fe_endpoint": "'"$FE_ENDPOINT"'"
  }'
  
  # echo "Request data: $DATA"
  
  curl --location "$BASE_URL/register" \
  --header 'Content-Type: application/json' \
  --data "$DATA"
}

# Function to schedule a run
schedule() {
  TIMESTAMP=$(get_log_timestamp)
  LOG_FILE="logs/autograder_run_${TIMESTAMP}.log"
  
  echo "Starting Autograder run at $(date)" > "$LOG_FILE"
  echo "----------------------------------------" >> "$LOG_FILE"
  
  DATA='{
    "group": '"$GROUP_NUMBER"',
    "gh_token": "'"${AUTOGRADER_TOKEN}"'"
  }'
  
  # echo "Request data: $DATA"
  
  curl --location "$BASE_URL/schedule" \
  --header 'Content-Type: application/json' \
  --data "$DATA" 2>&1 | tee -a "$LOG_FILE"
  
  echo "----------------------------------------" >> "$LOG_FILE"
  echo "Schedule command completed at $(date)" >> "$LOG_FILE"
  
  echo "Log file created at: $LOG_FILE"
}

# Function to monitor all runs
monitor_runs() {
  TIMESTAMP=$(get_log_timestamp)
  LOG_FILE="logs/autograder_monitor_${TIMESTAMP}.log"
  
  echo "Starting run monitoring at $(date)" > "$LOG_FILE"
  echo "----------------------------------------" >> "$LOG_FILE"
  
  while true; do
    DATA='{
      "group": '"$GROUP_NUMBER"',
      "gh_token": "'"${AUTOGRADER_TOKEN}"'"
    }'
    
    RESPONSE=$(curl --silent --location --request GET "$BASE_URL/run/all" \
      --header 'Content-Type: application/json' \
      --data "$DATA")
    
    echo "$(date): Response: $RESPONSE" | tee -a "$LOG_FILE"
    echo -n "   Monitoring Runs "
      for i in {1..5}; do
        echo -n "."
        sleep 1
      done
    echo -ne '\r'
    
    if [[ "$RESPONSE" != *$GROUP_NUMBER* ]]; then
      echo "----------------------------------------" >> "$LOG_FILE"
      echo "Run completed at $(date)" >> "$LOG_FILE"
      echo "Final run details:" >> "$LOG_FILE"
      last_run 2>&1 | tee -a "$LOG_FILE"
      break
    fi

    echo -ne '\r\033[K'
  done
  
  echo "Log file created at: $LOG_FILE"
}

# Function to get the best run score
best_run() {
  DATA='{
    "group": '"$GROUP_NUMBER"',
    "gh_token": "'"${AUTOGRADER_TOKEN}"'"
  }'
  
  # echo "Request data: $DATA"

  curl --location --request GET "$BASE_URL/best_run" \
  --header 'Content-Type: application/json' \
  --data "$DATA" | python3 -m json.tool
}

# Function to get the latest run score
last_run() {
  DATA='{
    "group": '"$GROUP_NUMBER"',
    "gh_token": "'"${AUTOGRADER_TOKEN}"'"
  }'
  
  # echo "Request data: $DATA"

  curl --location --request GET "$BASE_URL/last_run" \
  --header 'Content-Type: application/json' \
  --data "$DATA" | python3 -m json.tool
}

# Function to download a log file
download_log() {
  local log_path="$1"
  if [[ -z "$log_path" ]]; then
    echo "Error: Log path is required for the download_log command."
    echo "Usage: $0 download_log <log_path>"
    exit 1
  fi

  DATA='{
    "group": '"$GROUP_NUMBER"',
    "gh_token": "'"${AUTOGRADER_TOKEN}"'",
    "log": "'"$log_path"'"
  }'

  # echo "Request data: $DATA"

  curl --location --request GET "$BASE_URL/log/download" \
  --header 'Content-Type: application/json' \
  --data "$DATA"
}

# function to pull server logs
server_logs() {
  curl --location --request GET "$API_ENDPOINT/logs" > logs/server_logs.log
}

# function to get stats
stats() {
  curl --location --request GET "$BASE_URL/stats" \
    --header 'Content-Type: application/json' \
    --data '{"gh_token": "token here"}' | python3 -m json.tool
}

# Function to filter logs for a specific endpoint (follows --> /<endpoint>:)
filter_logs_by_endpoint() {
  local endpoint="$1"
  local logfile="logs/server_logs.log"
  local print=false

  while IFS= read -r line; do
    # Check if the line marks the start of an endpoint
    if [[ "$line" =~ \[INFO\]:\ --\>\ /([^:]+): ]]; then
      # Extract the endpoint name
      local current_endpoint="${BASH_REMATCH[1]}"
      # Toggle printing based on whether it's the desired endpoint
      if [ "$current_endpoint" == "$endpoint" ]; then
        print=true
      else
        print=false
      fi
    fi

    # Print the line if we're in the desired endpoint's logs
    if $print; then
      echo "$line"
    fi
  done < "$logfile"
}


# Parse flags and execute corresponding function
case "$1" in
  "register")
    register
    ;;
  "schedule")
    schedule
    monitor_runs
    ;;
  "monitor")
    monitor_runs
    ;;
  "best")
    best_run
    ;;
  "last")
    last_run
    ;;
  "logs")
    download_log "$2"
    ;;
  "server_logs")
    server_logs
    ;;
  "logs_by_endpoint")
    filter_logs_by_endpoint "$2"
    ;;
  "stats")
    stats
    ;;
  *)
    echo "Usage: $0 <register|schedule|monitor|best|last|logs|server_logs|logs_by_endpoint|stats>"
    exit 1
    ;;
esac