"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cli = cli;
const urlUtils_1 = require("./utils/urlUtils");
const fileUtils_1 = require("./utils/fileUtils");
const netScore_1 = require("./metrics/netScore");
const logger_1 = require("./logger");
/*
  Function Name: cli
  Description: This function serves as the main command-line interface logic. It reads the file path from the command-line arguments,
               reads URLs from the file, determines the URL type, processes each URL to extract owner and repo information, and then
               calculates the metrics using GetNetScore.
  @params: None
  @returns: None
*/
async function cli() {
    // Read from the command line arguments
    const args = process.argv.slice(2);
    // Check if exactly one argument (file path) is provided
    if (args.length !== 1) {
        logger_1.log.error("Usage: ./run FILE_PATH");
        process.exit(1); // Exit with error code if arguments are incorrect
    }
    // Extract the file path from command-line arguments
    const filePath = args[0];
    try {
        // Read URLs from the provided file
        logger_1.log.info(`Reading URLs from file: ${filePath}`);
        const urls = await (0, fileUtils_1.readUrlsFromFile)(filePath); // Assuming the file contains URLs line by line
        // Store the results of the processing
        const results = [];
        // Process each URL from the file
        for (let url of urls) {
            logger_1.log.info(`Processing URL: ${url}`);
            // Determine the type of the URL (GitHub, npm, or invalid)
            const urlType = (0, urlUtils_1.checkUrlType)(url);
            const rawUrl = url.trim();
            try {
                // Process the URL and extract the owner and repo information
                const { owner, repo } = await (0, urlUtils_1.processUrl)(urlType, rawUrl);
                // Calculate the metrics for the given owner and repo
                const metrics = await (0, netScore_1.GetNetScore)(owner, repo, url);
                // Print the results in JSON format
                console.log(JSON.stringify(metrics, null, 2)); // For pretty printing in output
            }
            catch (error) {
                // Log and print error if processing the URL fails
                logger_1.log.error(`Error processing URL ${url}:`, error);
                process.exit(1); // Exit with error code if a URL processing fails
            }
        }
    }
    catch (error) {
        // Log error if the file cannot be read
        logger_1.log.error(`Unable to read URLs from file ${filePath}`, error);
        process.exit(1); // Exit with error code if file read fails
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQWNBLGtCQStDQztBQTdERCwrQ0FBNEQ7QUFDNUQsaURBQXFEO0FBQ3JELGlEQUFpRDtBQUNqRCxxQ0FBK0I7QUFFL0I7Ozs7Ozs7RUFPRTtBQUVLLEtBQUssVUFBVSxHQUFHO0lBQ3ZCLHVDQUF1QztJQUN2QyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVuQyx3REFBd0Q7SUFDeEQsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3RCLFlBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUNwQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0RBQWtEO0lBQ3JFLENBQUM7SUFFRCxvREFBb0Q7SUFDcEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pCLElBQUksQ0FBQztRQUNILG1DQUFtQztRQUNuQyxZQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBQSw0QkFBZ0IsRUFBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLCtDQUErQztRQUU5RixzQ0FBc0M7UUFDdEMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBRW5CLGlDQUFpQztRQUNqQyxLQUFLLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3JCLFlBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFFbkMsMERBQTBEO1lBQzFELE1BQU0sT0FBTyxHQUFHLElBQUEsdUJBQVksRUFBQyxHQUFHLENBQUMsQ0FBQztZQUNsQyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFMUIsSUFBSSxDQUFDO2dCQUNILDZEQUE2RDtnQkFDN0QsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLElBQUEscUJBQVUsRUFBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBRTFELHFEQUFxRDtnQkFDckQsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFBLHNCQUFXLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDcEQsbUNBQW1DO2dCQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0NBQWdDO1lBQ2pGLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNmLGtEQUFrRDtnQkFDbEQsWUFBRyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsR0FBRyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ2pELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpREFBaUQ7WUFDcEUsQ0FBQztRQUNILENBQUM7SUFDSCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLHVDQUF1QztRQUN2QyxZQUFHLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxRQUFRLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5RCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsMENBQTBDO0lBQzdELENBQUM7QUFDSCxDQUFDIn0=