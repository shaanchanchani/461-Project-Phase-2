List Package Endpoint Documentation
================================

Endpoint: /packages
Method: POST

Description:
------------
This endpoint allows users to get packages from the registry that match specified query criteria. It supports pagination and can be used to enumerate all packages in the system.

Authentication:
--------------
- Required: Yes
- Type: Bearer Token
- Header: X-Authorization

Request:
--------
1. Body:
   - Content-Type: application/json
   - Schema: Array of PackageQuery objects
   - Example for listing all packages:
     ```json
     [
       {
         "Name": "*"
       }
     ]
     ```

2. Query Parameters:
   - offset (optional): Used for pagination
   - Type: string
   - Example: "3"

Response:
---------
1. Success (200 OK):
   - Headers:
     - offset: Pagination offset for the next query
   - Body:
     - Content-Type: application/json
     - Schema: Array of PackageMetadata objects
     - Example:
       ```json
       [
         {
           "Version": "1.2.3",
           "Name": "Underscore",
           "ID": "underscore"
         },
         {
           "Version": "1.2.3",
           "Name": "Lodash",
           "ID": "lodash"
         }
       ]
       ```

2. Error Responses:
   - 400 Bad Request:
     - Cause: Missing or improperly formed PackageQuery
   - 403 Forbidden:
     - Cause: Authentication failed (invalid or missing token)
   - 413 Payload Too Large:
     - Cause: Too many packages returned

Implementation Steps:
-------------------
1. Authentication Layer:
   - Implement middleware to validate X-Authorization token
   - Return 403 if token is invalid or missing

2. Request Validation:
   - Validate the request body is a valid array of PackageQuery objects
   - Check for required fields in each PackageQuery
   - Return 400 if validation fails

3. Query Processing:
   - Implement logic to handle wildcard queries ("*")
   - Support exact name matching
   - Implement pagination using the offset parameter

4. Database Integration:
   - Query the database for matching packages
   - Implement efficient pagination
   - Handle the case when too many results are found (413 error)

5. Response Formatting:
   - Format package metadata according to the specified schema
   - Include the next offset in the response header
   - Ensure all required fields (Version, Name, ID) are included

6. Error Handling:
   - Implement proper error responses with appropriate status codes
   - Include meaningful error messages in the response

Testing Requirements:
-------------------
1. Authentication Tests:
   - Valid token succeeds
   - Invalid token returns 403
   - Missing token returns 403

2. Query Tests:
   - Wildcard query returns all packages
   - Specific name query returns matching packages
   - Invalid query format returns 400

3. Pagination Tests:
   - Verify offset works correctly
   - Verify next offset is returned
   - Test with various page sizes

4. Error Cases:
   - Test all error responses
   - Verify error message format
   - Test boundary conditions

Notes:
------
1. The endpoint must be efficient when handling large numbers of packages
2. Implement proper security measures to prevent unauthorized access
3. Consider implementing caching for frequently accessed queries
4. Ensure proper logging for monitoring and debugging
5. Consider rate limiting to prevent abuse
