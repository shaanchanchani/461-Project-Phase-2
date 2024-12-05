Rate Package Endpoint Documentation
================================

Endpoint: /package/{id}/rate
Method: GET

Description:
------------
This endpoint retrieves the rating metrics for a package in the registry based on the specified package ID. The rating system evaluates various aspects of the package's quality, maintenance, and usability.

Authentication:
--------------
- Required: Yes
- Type: Bearer Token
- Header: X-Authorization

Request:
--------
1. Parameters:
   - `id` (string, required): UUID of the package to rate

2. Example Curl Command:
   ```bash
   curl -X GET "http://localhost:3000/package/{id}/rate" \
     -H "X-Authorization: bearer <your_token_here>"
   ```

Response:
---------
1. Success (200 OK):
   - Content-Type: application/json
   - Schema: PackageRating
   - Example:
     ```json
     {
       "BusFactor": 0.85,
       "Correctness": 0.95,
       "RampUp": 0.75,
       "ResponsiveMaintainer": 0.90,
       "LicenseScore": 1.0,
       "GoodPinningPractice": 0.80,
       "PullRequest": 0.70,
       "NetScore": 0.82,
       "BusFactorLatency": 0.15,
       "CorrectnessLatency": 0.10,
       "RampUpLatency": 0.20,
       "ResponsiveMaintainerLatency": 0.12,
       "LicenseScoreLatency": 0.05,
       "GoodPinningPracticeLatency": 0.18,
       "PullRequestLatency": 0.25,
       "NetScoreLatency": 0.15
     }
     ```

2. Error Responses:

   400 Bad Request:
   ```json
   {
     "error": "Bad Request",
     "message": "Invalid package ID format"
   }
   ```

   403 Forbidden:
   ```json
   {
     "error": "Forbidden",
     "message": "Invalid or missing authentication token"
   }
   ```

   404 Not Found:
   ```json
   {
     "error": "Not Found",
     "message": "Package with ID '{id}' does not exist"
   }
   ```

   500 Internal Server Error:
   ```json
   {
     "error": "Internal Server Error",
     "message": "Failed to compute package metrics"
   }
   ```

Metric Descriptions:
------------------
- **NetScore**: Overall package quality score (0-1)
- **BusFactor**: Measure of project's contributor distribution and risk (0-1)
- **Correctness**: Code quality and test coverage assessment (0-1)
- **RampUp**: Ease of getting started with the package (0-1)
- **ResponsiveMaintainer**: Maintainer's response time and activity (0-1)
- **LicenseScore**: License compatibility and compliance (0-1)
- **GoodPinningPractice**: Dependency version management quality (0-1)
- **PullRequest**: Pull request process and review quality (0-1)

Latency metrics indicate the time taken to compute each corresponding metric.

Notes:
------
1. All metric scores are normalized between 0 and 1
2. Higher scores indicate better quality
3. Latency values are in seconds
4. The endpoint may take longer to respond for larger packages
5. Rate limiting: Maximum 100 requests per hour per authenticated user