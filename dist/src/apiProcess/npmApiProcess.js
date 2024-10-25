"use strict";
// Contains functions to interact with the npm registry, find corresponding GitHub repositories, and process the responses.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGitHubRepoFromNpmUrl = getGitHubRepoFromNpmUrl;
exports.getNpmPackageInfo = getNpmPackageInfo;
const dotenv = __importStar(require("dotenv"));
dotenv.config(); // Load environment variables from a .env file into process.env
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../logger");
const NPM_API_URL = "https://registry.npmjs.org";
/*
  Function Name: getGitHubRepoFromNpmUrl
  Description: This function fetches the GitHub repository URL from the npm registry for a given package.
  @params:
    - packageName: string - The name of the npm package
  @returns: string - The GitHub repository URL if found, otherwise throws an error.
*/
async function getGitHubRepoFromNpmUrl(packageName) {
    try {
        logger_1.log.info(`Fetching GitHub repository URL for package: ${packageName}`);
        // Fetch package metadata from npm registry
        const url = `${NPM_API_URL}/${packageName}`;
        const response = await axios_1.default.get(url);
        logger_1.log.debug(`Received response from npm registry for ${packageName}`);
        // Extract GitHub repository URL from package metadata
        const repositoryUrl = response.data.repository?.url;
        if (repositoryUrl) {
            const sanitizedUrl = repositoryUrl
                .replace("git+", "")
                .replace(".git", "");
            logger_1.log.info(`GitHub repository URL found for ${packageName}: ${sanitizedUrl}`);
            return sanitizedUrl;
        }
        else {
            console.error(`GitHub repository URL not found in package metadata for ${packageName}`);
            process.exit(1);
        }
    }
    catch (error) {
        console.error(`getGitHubRepoFromNpmUrl: Failed to fetch data for ${packageName}:`, error);
        process.exit(1);
    }
}
/*
  Function Name: getNpmPackageInfo
  Description: This function fetches npm package metadata such as license, description, maintainers, and contributors.
  @params:
    - packageName: string - The name of the npm package
  @returns: packageInfo - Object containing package license, description, number of maintainers, and number of contributors.
*/
async function getNpmPackageInfo(packageName) {
    try {
        logger_1.log.info(`Fetching npm package info for ${packageName}`);
        // Fetch package metadata from npm registry
        const url = `${NPM_API_URL}/${packageName}`;
        const response = await axios_1.default.get(url);
        logger_1.log.debug(`Received npm package metadata for ${packageName}`);
        // Extract package metadata
        const packageData = response.data;
        const license = packageData.license || "No license";
        const description = packageData.description || "No description";
        const numberOfMaintainers = packageData.maintainers
            ? packageData.maintainers.length
            : 0;
        const numberOfContributors = packageData.contributors
            ? packageData.contributors.length
            : 0;
        const packageInfo = {
            license: license,
            description: description,
            numberOfMaintainers: numberOfMaintainers,
            numberOfContributors: numberOfContributors,
        };
        logger_1.log.info(`Successfully fetched package info for ${packageName}`);
        logger_1.log.debug(`Package Info: ${JSON.stringify(packageInfo)}`);
        return packageInfo;
    }
    catch (error) {
        logger_1.log.error(`getNpmPackageInfo: Failed to fetch data for ${packageName}:`, error);
        return {
            license: "No license",
            description: "No description",
            numberOfMaintainers: 0,
            numberOfContributors: 0,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtQXBpUHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcGlQcm9jZXNzL25wbUFwaVByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDJIQUEySDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXdCM0gsMERBbUNDO0FBVUQsOENBNkNDO0FBaEhELCtDQUFpQztBQUNqQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQywrREFBK0Q7QUFDaEYsa0RBQTBCO0FBQzFCLHNDQUFnQztBQUVoQyxNQUFNLFdBQVcsR0FBRyw0QkFBNEIsQ0FBQztBQVNqRDs7Ozs7O0VBTUU7QUFFSyxLQUFLLFVBQVUsdUJBQXVCLENBQzNDLFdBQW1CO0lBRW5CLElBQUksQ0FBQztRQUNILFlBQUcsQ0FBQyxJQUFJLENBQUMsK0NBQStDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFFdkUsMkNBQTJDO1FBQzNDLE1BQU0sR0FBRyxHQUFHLEdBQUcsV0FBVyxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQzVDLE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0QyxZQUFHLENBQUMsS0FBSyxDQUFDLDJDQUEyQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBRXBFLHNEQUFzRDtRQUN0RCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUM7UUFFcEQsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNsQixNQUFNLFlBQVksR0FBRyxhQUFhO2lCQUMvQixPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztpQkFDbkIsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN2QixZQUFHLENBQUMsSUFBSSxDQUNOLG1DQUFtQyxXQUFXLEtBQUssWUFBWSxFQUFFLENBQ2xFLENBQUM7WUFDRixPQUFPLFlBQVksQ0FBQztRQUN0QixDQUFDO2FBQU0sQ0FBQztZQUNOLE9BQU8sQ0FBQyxLQUFLLENBQ1gsMkRBQTJELFdBQVcsRUFBRSxDQUN6RSxDQUFDO1lBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQixDQUFDO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUNYLHFEQUFxRCxXQUFXLEdBQUcsRUFDbkUsS0FBSyxDQUNOLENBQUM7UUFDRixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLENBQUM7QUFDSCxDQUFDO0FBRUQ7Ozs7OztFQU1FO0FBRUssS0FBSyxVQUFVLGlCQUFpQixDQUNyQyxXQUFtQjtJQUVuQixJQUFJLENBQUM7UUFDSCxZQUFHLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBRXpELDJDQUEyQztRQUMzQyxNQUFNLEdBQUcsR0FBRyxHQUFHLFdBQVcsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUM1QyxNQUFNLFFBQVEsR0FBRyxNQUFNLGVBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEMsWUFBRyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUU5RCwyQkFBMkI7UUFDM0IsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQztRQUNsQyxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBTyxJQUFJLFlBQVksQ0FBQztRQUNwRCxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsV0FBVyxJQUFJLGdCQUFnQixDQUFDO1FBQ2hFLE1BQU0sbUJBQW1CLEdBQUcsV0FBVyxDQUFDLFdBQVc7WUFDakQsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTTtZQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ04sTUFBTSxvQkFBb0IsR0FBRyxXQUFXLENBQUMsWUFBWTtZQUNuRCxDQUFDLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNO1lBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFTixNQUFNLFdBQVcsR0FBZ0I7WUFDL0IsT0FBTyxFQUFFLE9BQU87WUFDaEIsV0FBVyxFQUFFLFdBQVc7WUFDeEIsbUJBQW1CLEVBQUUsbUJBQW1CO1lBQ3hDLG9CQUFvQixFQUFFLG9CQUFvQjtTQUMzQyxDQUFDO1FBRUYsWUFBRyxDQUFDLElBQUksQ0FBQyx5Q0FBeUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUNqRSxZQUFHLENBQUMsS0FBSyxDQUFDLGlCQUFpQixJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUUxRCxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLFlBQUcsQ0FBQyxLQUFLLENBQ1AsK0NBQStDLFdBQVcsR0FBRyxFQUM3RCxLQUFLLENBQ04sQ0FBQztRQUNGLE9BQU87WUFDTCxPQUFPLEVBQUUsWUFBWTtZQUNyQixXQUFXLEVBQUUsZ0JBQWdCO1lBQzdCLG1CQUFtQixFQUFFLENBQUM7WUFDdEIsb0JBQW9CLEVBQUUsQ0FBQztTQUN4QixDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMifQ==