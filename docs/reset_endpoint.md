# Reset Endpoint Documentation

## Overview
The reset endpoint returns the registry to its system default state by clearing all packages and restoring the default user configuration. This is a global system operation that affects all stored packages and related data.

## API Specification

### Endpoint
```
DELETE /reset
```

### Headers
- `X-Authorization` (required): Authentication token

### Response Status Codes
| Code | Description |
|------|-------------|
| 200  | Registry is reset successfully |
| 401  | No permission to reset the registry |
| 403  | Authentication failed due to invalid/missing AuthenticationToken |

### Example Request
```bash
curl -X DELETE \
  https://your-api-endpoint/reset \
  -H 'X-Authorization: bearer eyJhbGciOiJIUzI1NiIs...'
```

### Example Response
Success (200):
```json
{
  "status": "success",
  "message": "Registry reset to default state"
}
```

Error (401):
```json
{
  "error": "Unauthorized",
  "message": "You do not have permission to reset the registry"
}
```

Error (403):
```json
{
  "error": "Forbidden",
  "message": "Authentication failed due to invalid or missing AuthenticationToken"
}
```

## Default State
After reset, the system will be in the following state:

1. Empty package registry (no packages stored)
2. Default admin user configured with:
   ```json
   {
     "User": {
       "name": "ece30861defaultadminuser",
       "isAdmin": true
     },
     "Secret": {
       "password": "correcthorsebatterystaple123(!__+@**(A;DROP TABLE packages"
     }
   }
   ```

## Implementation Guide

### AWS Infrastructure Requirements

1. **S3 Operations**
   - Delete all package zip files stored in S3
   - Handle pagination for large numbers of objects
   ```javascript
   async function clearS3Bucket(bucketName) {
     const objects = await s3.listObjectsV2({ Bucket: bucketName }).promise();
     if (objects.Contents.length > 0) {
       await s3.deleteObjects({
         Bucket: bucketName,
         Delete: {
           Objects: objects.Contents.map(({ Key }) => ({ Key }))
         }
       }).promise();
     }
   }
   ```

2. **DynamoDB Operations**
   - Clear all package-related tables
   - Maintain or restore default user if implementing authentication
   ```javascript
   async function clearDynamoTable(tableName) {
     const items = await dynamoDB.scan({ TableName: tableName }).promise();
     if (items.Items.length > 0) {
       const deleteRequests = items.Items.map(item => ({
         DeleteRequest: {
           Key: {
             id: item.id // adjust key structure based on your schema
           }
         }
       }));
       
       // Process in batches of 25 (DynamoDB limit)
       for (let i = 0; i < deleteRequests.length; i += 25) {
         const batch = deleteRequests.slice(i, i + 25);
         await dynamoDB.batchWrite({
           RequestItems: {
             [tableName]: batch
           }
         }).promise();
       }
     }
   }
   ```

### Implementation Steps

1. **Authentication Check**
   ```javascript
   function validateAuth(authToken) {
     if (!authToken) throw new Error('Missing authentication token');
     // Implement your token validation logic
   }
   ```

2. **Reset Operation**
   ```javascript
   async function resetRegistry() {
     try {
       // Clear S3
       await clearS3Bucket(PACKAGE_BUCKET_NAME);
       
       // Clear DynamoDB tables
       await clearDynamoTable(PACKAGE_TABLE_NAME);
       await clearDynamoTable(METADATA_TABLE_NAME);
       
       // Restore default user if implementing authentication
       await restoreDefaultUser();
       
       return {
         status: 'success',
         message: 'Registry reset to default state'
       };
     } catch (error) {
       throw new Error(`Reset failed: ${error.message}`);
     }
   }
   ```

3. **Error Handling**
   ```javascript
   function handleResetError(error) {
     if (error.message.includes('authentication')) {
       return {
         statusCode: 403,
         body: JSON.stringify({
           error: 'Forbidden',
           message: error.message
         })
       };
     }
     // Add other error cases as needed
   }
   ```

### Important Considerations

1. **Atomicity**
   - Consider implementing transactional behavior
   - Roll back partial changes if any operation fails
   - Use DynamoDB transactions when possible

2. **Performance**
   - Implement pagination for large datasets
   - Use batch operations for efficient deletion
   - Consider implementing progress tracking for large resets

3. **Security**
   - Validate authentication tokens thoroughly
   - Implement proper access controls
   - Log reset operations for audit purposes

4. **Testing**
   - Test with various data volumes
   - Verify proper cleanup of all resources
   - Ensure default state is correctly restored
   - Test error scenarios and recovery

### Example Lambda Implementation

```javascript
exports.handler = async (event, context) => {
  try {
    const authToken = event.headers['X-Authorization'];
    validateAuth(authToken);
    
    await resetRegistry();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        message: 'Registry reset to default state'
      })
    };
  } catch (error) {
    return handleResetError(error);
  }
};
```

## Monitoring and Logging

Consider implementing the following monitoring practices:
1. Log all reset operations with timestamps
2. Track the number of items deleted
3. Monitor operation duration
4. Set up alerts for failed resets
5. Maintain audit trails for security purposes

## Best Practices

1. Implement proper error handling and recovery
2. Use batch operations for efficient deletion
3. Consider implementing progress tracking for large resets
4. Maintain detailed logs for audit purposes
5. Implement proper access controls
6. Test thoroughly with various data volumes
7. Consider rate limiting to prevent abuse
8. Implement timeout handling for large operations
