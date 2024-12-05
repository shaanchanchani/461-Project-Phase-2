Download Package Endpoint Documentation
================================

Endpoint: /package/{id}
Method: GET

Description:
------------
This endpoint allows users to download a package from the registry by specifying the package ID.

Authentication:
--------------
- Required: Yes
- Type: Bearer Token
- Header: X-Authorization

Request:
--------
1. Parameters:
   - `id` (string, required): ID of the package to fetch.

Response:
---------
1. Success (200 OK):
   - Content-Type: application/json
   - Schema: Package
   - Example:
     ```json
     {
       "metadata": {
         "Name": "Underscore",
         "Version": "1.0.0",
         "ID": "underscore"
       },
       "data": {
         "Content": "base64-encoded-content",
         "JSProgram": "optional-js-program"
       }
     }
     ```
2. Error (400 Bad Request):
   - Description: Missing field(s) in the PackageID or it is formed improperly, or is invalid.

3. Error (403 Forbidden):
   - Description: Authentication failed due to invalid or missing AuthenticationToken.

4. Error (404 Not Found):
   - Description: Package not found.
