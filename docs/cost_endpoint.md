Cost Package Endpoint Documentation
================================

Endpoint: /package/{id}/cost
Method: GET

Description:
------------
This endpoint calculates and returns the size cost of a package in megabytes (MB). When the dependency parameter is enabled, it includes the cumulative cost of all package dependencies.

Authentication:
--------------
- Required: Yes
- Type: Bearer Token
- Header: X-Authorization

Request:
--------
1. Parameters:
   - `id` (string, required): ID of the package to calculate cost.
   - `dependency` (boolean, optional): When true, includes costs of all dependencies. Defaults to false.

Response:
---------
1. Success (200 OK):
   - Content-Type: application/json
   - Schema: PackageCost
   - Example without dependencies:
     ```json
     {
       "357898765": {
         "totalCost": 50.0
       }
     }
     ```
   - Example with dependencies:
     ```json
     {
       "357898765": {
         "standaloneCost": 50.0,
         "totalCost": 95.0
       },
       "988645763": {
         "standaloneCost": 20.0,
         "totalCost": 45.0
       }
     }
     ```

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