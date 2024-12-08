#!/usr/bin/env python3
import json
import sys
import os
import re
from typing import Dict, Any

# ANSI color codes
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    GRAY = '\033[90m'

def extract_score(total_str: str) -> tuple[int, int]:
    """Extract numerator and denominator from a total string like '14 / 22 (1 hidden)'"""
    match = re.match(r'(\d+)\s*/\s*(\d+)', total_str)
    if match:
        return int(match.group(1)), int(match.group(2))
    return 0, 0

def get_color_for_score(score: float) -> str:
    """Return appropriate color based on score percentage"""
    if score >= 0.9:
        return Colors.GREEN
    elif score >= 0.7:
        return Colors.YELLOW
    else:
        return Colors.RED

def get_color_for_test_score(score: int) -> str:
    """Return appropriate color based on test score"""
    if score >= 2:
        return Colors.GREEN
    elif score == 1:
        return Colors.YELLOW
    else:
        return Colors.RED

def format_test_name(name: str) -> str:
    """Format test name to be more readable"""
    # Remove common prefixes and suffixes
    name = re.sub(r'Test Package \d+', '', name)
    name = name.replace('Test', '').strip()
    # Add spaces before capital letters
    name = re.sub(r'(?<!^)(?=[A-Z])', ' ', name)
    return name.strip()

def find_json_in_log(content: str) -> dict:
    """Find and parse the JSON content in the log file"""
    # Look for the last occurrence of a JSON object in the file
    json_matches = list(re.finditer(r'(\{(?:[^{}]|(?1))*\})', content))
    if not json_matches:
        raise ValueError("No JSON object found in log file")
    
    # Get the last (most recent) JSON object
    last_json = json_matches[-1].group(0)
    return json.loads(last_json)

def parse_autograder_log(log_file: str) -> None:
    """Parse and display autograder results in a clean format"""
    try:
        with open(log_file, 'r') as f:
            content = f.read()
            
        # Find and parse the JSON output
        try:
            results = find_json_in_log(content)
        except Exception as e:
            print(f"{Colors.RED}Error parsing JSON from log: {str(e)}{Colors.ENDC}")
            return
            
        # Print header
        print(f"\n{Colors.HEADER}{Colors.BOLD}=== Autograder Results ==={Colors.ENDC}\n")
        
        total_score = 0
        total_possible = 0
        
        # Process each test group
        for group_name, group_data in results.items():
            # Skip non-test group entries
            if not isinstance(group_data, dict) or 'Total' not in group_data:
                continue
            if group_name in ['autgrader_run_log', 'system_run_log', 'start_time', 'end_time', 'run_time']:
                continue
                
            score, possible = extract_score(group_data['Total'])
            if possible == 0:
                continue
                
            percentage = score / possible
            color = get_color_for_score(percentage)
            
            # Print group header
            print(f"{Colors.BLUE}{Colors.BOLD}{group_name}:{Colors.ENDC}")
            print(f"  Score: {color}{score}/{possible} ({percentage:.1%}){Colors.ENDC}")
            
            # Print individual test results
            for test_name, test_score in group_data.items():
                if test_name == 'Total':
                    continue
                    
                if isinstance(test_score, (int, float)):
                    test_color = get_color_for_test_score(test_score)
                    formatted_name = format_test_name(test_name)
                    if formatted_name:  # Skip empty names
                        print(f"    {Colors.GRAY}•{Colors.ENDC} {formatted_name}: {test_color}{test_score}{Colors.ENDC}")
            
            # Add to totals
            total_score += score
            total_possible += possible
            
            # Print any hidden tests
            if '(hidden)' in group_data['Total']:
                print(f"  {Colors.YELLOW}Note: Contains hidden tests{Colors.ENDC}")
            print()
        
        # Print overall score
        if total_possible > 0:
            overall_percentage = total_score / total_possible
            color = get_color_for_score(overall_percentage)
            print(f"{Colors.BOLD}Overall Score: {color}{total_score}/{total_possible} ({overall_percentage:.1%}){Colors.ENDC}")
            
        # Print run information
        if 'run_time' in results:
            print(f"\n{Colors.GRAY}Run completed in {results['run_time']}{Colors.ENDC}\n")

    except Exception as e:
        print(f"{Colors.RED}Error parsing log file: {str(e)}{Colors.ENDC}")

def main():
    # Get the most recent log file from the logs directory
    logs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
    autograder_logs = [f for f in os.listdir(logs_dir) if f.startswith('autograder_')]
    
    if not autograder_logs:
        print(f"{Colors.RED}No autograder logs found{Colors.ENDC}")
        return
        
    latest_log = max(autograder_logs, key=lambda x: os.path.getctime(os.path.join(logs_dir, x)))
    log_path = os.path.join(logs_dir, latest_log)
    
    parse_autograder_log(log_path)

if __name__ == '__main__':
    main()
