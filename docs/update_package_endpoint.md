Update Package Endpoint Documentation
================================

Endpoint: /package/{id}
Method: PUT

Description:
------------
This endpoint allows users to update an existing package in the registry. The update can be performed using either a URL to a GitHub/npm repository or by providing the package content directly. Each update creates a new version entry while maintaining the package's history.

Authentication:
--------------
- Required: Yes
- Type: Bearer Token
- Header: X-Authorization

Request:
--------
1. URL Parameters:
   - id: Package ID (string, required)
     - Format: Alphanumeric with hyphens
     - Example: "package-123"

2. Body:
   - Content-Type: application/json
   - Schema: Must provide either URL or Content, but not both
   - Example with URL:
     ```json
     {
       "URL": "https://github.com/owner/repo",
       "JSProgram": "optional-js-program"
     }
     ```
   - Example with Content:
     ```json
     {
       "Content": "base64-encoded-zip-content",
       "JSProgram": "optional-js-program"
     }
     ```

Response:
---------
1. Success (200 OK):
   - Content-Type: application/json
   - Example:
     ```json
     {
       "metadata": {
         "Name": "package-name",
         "Version": "1.0.1",
         "ID": "package-123"
       },
       "data": {
         "Content": "base64-encoded-content",
         "JSProgram": "provided-js-program"
       }
     }
     ```

2. Error Responses:
   - 400 Bad Request: Invalid request format or validation failed
   - 401 Unauthorized: Missing or invalid authentication token
   - 404 Not Found: Package ID does not exist
   - 424 Failed Dependency: Package failed quality requirements

Notes:
------
1. The package content must be a valid zip file containing a package.json file
2. If URL is provided, it must be a valid GitHub or npm repository URL
3. Each update creates a new version entry while maintaining the package's history
4. The latest version is updated in the main package record
5. Package metrics are evaluated before accepting the update
