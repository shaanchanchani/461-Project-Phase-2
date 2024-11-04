// // The main entry point of the application.
// import { cli } from "./cli";
// import { log } from "./logger";
// // import express from 'express';
// // import AWS from 'aws-sdk'; // Import AWS SDK

// // Create an instance of an Express application
// // const app = express();
// // const port = 3000;

// // Initialize DynamoDB
// // const dynamoDB = new AWS.DynamoDB({
// //   region: 'us-east-1', // Replace with your AWS region
// // });

// // // Function to test DynamoDB connection
// // async function testDynamoDBConnection() {
// //   try {
// //     // Perform a simple operation to check the connection (list tables)
// //     const data = await dynamoDB.listTables().promise();
// //     log.info('DynamoDB Tables: ' + data.TableNames.join(', '));
// //   } catch (error) {
// //     log.error('Error connecting to DynamoDB: ' + error.message);
// //   }
// // }

// // Info log
// log.info("Starting application... info");

// // Start the server
// // app.listen(port, async () => {
// //   log.info(`Server running on port ${port}`);
  
//   // Test DynamoDB connection after the server starts
//   // await testDynamoDBConnection();
// // });

import express from 'express';

const app = express();
const port = 3000;

// Enable JSON parsing for requests
app.use(express.json());

// Test endpoint
app.get('/test', (req, res) => {
  res.send('test');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;