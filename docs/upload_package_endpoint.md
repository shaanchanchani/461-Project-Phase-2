Upload Package Endpoint Documentation
================================

Endpoint: /package
Method: POST

Description:
------------
This endpoint allows users to upload a new package to the registry. The package can be uploaded either by providing a URL to a GitHub/npm repository or by providing the package content directly.

Authentication:
--------------
- Required: Yes
- Type: Bearer Token
- Header: X-Authorization

Request:
--------
1. Body:
   - Content-Type: application/json
   - Schema: Must provide either Content or URL, but not both
   - Description: Upload or ingest a new package. Packages that are uploaded may have the same name but must have a new version.
   - Fields:
     * Content (string, optional): Base64-encoded ZIP file of the package
       - Must be a zipped version of an npm package's GitHub repository
       - Should not include the ".git/" directory
       - Should include the "package.json" file that can be used to retrieve the project homepage
     * URL (string, optional): Package URL for public ingest
     * debloat (boolean, optional): If true, removes unnecessary bloat from the package
     * JSProgram (string, optional): A JavaScript program for use with sensitive modules
   
   - Example with URL:
     ```json
     {
       "URL": "https://github.com/owner/repo",
       "JSProgram": "optional-js-program",
       "debloat": true
     }
     ```
   - Example with Content:
     ```json
     {
       "Content": "base64-encoded-zip-content",
       "JSProgram": "optional-js-program",
       "debloat": false
     }
     ```

Response:
---------
1. Success (201 Created):
   - Content-Type: application/json
   - Example:
     ```json
     {
       "metadata": {
         "Name": "package-name",
         "Version": "1.0.0",
         "ID": "package-id"
       },
       "data": {
         "Content": "base64-encoded-zip-content",
         "JSProgram": "js-program-content"
       }
     }
     ```

2. Error Responses:
   - 400 Bad Request:
     - Missing required fields
     - Malformed request body
     - Invalid package data
     - Both Content and URL are set
   - 403 Forbidden:
     - Invalid or missing authentication token
   - 409 Conflict:
     - Package name already exists with the same version

Notes:
------
1. The package name must be unique in the registry
2. The Content field must be a valid base64-encoded ZIP file
3. The URL must point to a valid GitHub or npm repository
4. The JSProgram field is optional but if provided must be valid JavaScript code
5. The response includes a unique package ID that can be used for future operations
