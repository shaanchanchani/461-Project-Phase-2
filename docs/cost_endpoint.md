Cost Package Endpoint Documentation
================================

Endpoint: /package/{id}/cost
Method: GET

Description:
------------
This endpoint calculates and returns the size cost of a package in megabytes (MB). Currently, this implementation only supports standalone package cost calculation without dependency resolution.

Authentication:
--------------
- Required: Yes
- Type: Bearer Token
- Header: X-Authorization

Request:
--------
1. Parameters:
   - `id` (string, required): ID of the package to calculate cost.
   - `dependency` (boolean, optional): Currently not supported - defaults to false. Future versions will support dependency cost calculation.

Response:
---------
1. Success (200 OK):
   - Content-Type: application/json
   - Schema: PackageCost
   - Example response:
     ```json
     {
       "357898765": {
         "totalCost": 50.0
       }
     }
     ```
   Note: The totalCost represents the standalone size of the package in MB without including dependencies.

2. Error (400 Bad Request):
   ```json
   {
     "code": 400,
     "message": "Invalid or missing package ID"
   }
   ```

3. Error (403 Forbidden):
   ```json
   {
     "code": 403,
     "message": "Authentication failed. Invalid or missing token"
   }
   ```

4. Error (404 Not Found):
   ```json
   {
     "code": 404,
     "message": "Package not found"
   }
   ```

5. Error (500 Internal Server Error):
   ```json
   {
     "code": 500,
     "message": "Failed to compute package costs"
   }
   ```

Future Enhancements:
------------------
- Support for dependency cost calculation will be added in future versions
- When implemented, setting dependency=true will return both standalone and total costs including all package dependencies
