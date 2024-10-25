"use strict";
// // The main entry point of the application.
// import { cli } from "./cli";
// import { log } from "./logger";
// // import express from 'express';
// // import AWS from 'aws-sdk'; // Import AWS SDK
Object.defineProperty(exports, "__esModule", { value: true });
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
//The main entry point of the application.
const cli_1 = require("./cli");
const logger_1 = require("./logger");
//info log
logger_1.log.info("Starting application... info");
//debug log
// log.debug('Calling cli function... debug');
(0, cli_1.cli)();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDhDQUE4QztBQUM5QywrQkFBK0I7QUFDL0Isa0NBQWtDO0FBQ2xDLG9DQUFvQztBQUNwQyxrREFBa0Q7O0FBRWxELGtEQUFrRDtBQUNsRCw0QkFBNEI7QUFDNUIsd0JBQXdCO0FBRXhCLHlCQUF5QjtBQUN6Qix5Q0FBeUM7QUFDekMsNERBQTREO0FBQzVELFNBQVM7QUFFVCw2Q0FBNkM7QUFDN0MsK0NBQStDO0FBQy9DLGFBQWE7QUFDYiw2RUFBNkU7QUFDN0UsNkRBQTZEO0FBQzdELHFFQUFxRTtBQUNyRSx5QkFBeUI7QUFDekIsc0VBQXNFO0FBQ3RFLFNBQVM7QUFDVCxPQUFPO0FBRVAsY0FBYztBQUNkLDRDQUE0QztBQUU1QyxzQkFBc0I7QUFDdEIsb0NBQW9DO0FBQ3BDLG1EQUFtRDtBQUVuRCx3REFBd0Q7QUFDeEQsdUNBQXVDO0FBQ3ZDLFNBQVM7QUFHVCwwQ0FBMEM7QUFDMUMsK0JBQTRCO0FBQzVCLHFDQUErQjtBQUUvQixVQUFVO0FBQ1YsWUFBRyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQ3pDLFdBQVc7QUFDWCw4Q0FBOEM7QUFDOUMsSUFBQSxTQUFHLEdBQUUsQ0FBQyJ9