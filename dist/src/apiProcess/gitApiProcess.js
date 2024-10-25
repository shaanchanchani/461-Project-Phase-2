"use strict";
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
exports.getGithubInfo = getGithubInfo;
exports._fetchRepoData = _fetchRepoData;
exports._fetchLicense = _fetchLicense;
exports._fetchLatestCommits = _fetchLatestCommits;
exports._fetchLatestIssues = _fetchLatestIssues;
exports._fetchContributors = _fetchContributors;
exports._handleError = _handleError;
//Contains functions to interact with the GitHub API and process the responses
const dotenv = __importStar(require("dotenv"));
dotenv.config(); // Load environment variables from a .env file into process.env
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../logger");
const bottleneck_1 = __importDefault(require("bottleneck"));
// GitHub API URL
const GITHUB_API_URL = "https://api.github.com/repos";
// Check if the GITHUB_TOKEN environment variable is set
if (!process.env.GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN environment variable not set");
    process.exit(1);
}
// Rate limiter to prevent hitting the GitHub API rate limit (5000 requests per hour for authenticated users)
const limiter = new bottleneck_1.default({
    // rate limit = (3600 sec/hr) / (5000 req/hr) = 0.72 sec/req = 720 ms/req ~ 750 ms/req
    maxConcurrent: 1,
    minTime: 750, // 750ms between each request
});
// Map of license names to their full names
const licenseMap = {
    "AFL-3.0": "Academic Free License v3.0",
    "Apache-2.0": "Apache License 2.0",
    "Artistic-2.0": "Artistic License 2.0",
    "BSL-1.0": "Boost Software License 1.0",
    "BSD-2-Clause": "BSD 2-clause 'Simplified' License",
    "BSD-3-Clause": "BSD 3-clause 'New' or 'Revised' License",
    "BSD-3-Clause-Clear": "BSD 3-clause Clear License",
    "BSD-4-Clause": "BSD 4-clause 'Original' or 'Old' License",
    "0BSD": "BSD Zero-Clause License",
    "CC0-1.0": "Creative Commons Zero v1.0 Universal",
    "CC-BY-4.0": "Creative Commons Attribution 4.0",
    "CC-BY-SA-4.0": "Creative Commons Attribution ShareAlike 4.0",
    WTFPL: "Do What The F*ck You Want To Public License",
    "ECL-2.0": "Educational Community License v2.0",
    "EPL-1.0": "Eclipse Public License 1.0",
    "EPL-2.0": "Eclipse Public License 2.0",
    "EUPL-1.1": "European Union Public License 1.1",
    "AGPL-3.0": "GNU Affero General Public License v3.0",
    "GPL-2.0": "GNU General Public License v2.0",
    "GPL-3.0": "GNU General Public License v3.0",
    "LGPL-2.1": "GNU Lesser General Public License v2.1",
    "LGPL-3.0": "GNU Lesser General Public License v3.0",
    ISC: "ISC License",
    "LPPL-1.3c": "LaTeX Project Public License v1.3c",
    "MS-PL": "Microsoft Public License",
    MIT: "MIT License",
    "MPL-2.0": "Mozilla Public License 2.0",
    "OSL-3.0": "Open Software License 3.0",
    PostgreSQL: "PostgreSQL License",
    "OFL-1.1": "SIL Open Font License 1.1",
    NCSA: "University of Illinois/NCSA Open Source License",
    Unlicense: "The Unlicense",
    Zlib: "zLib License",
};
/*
  Function Name: getGithubInfo
  Description: This function fetches the repository details from GitHub using the Github API
  @params: owner: string - the owner of the repository
  @params: repo: string - the name of the repository
  @returns: Promise<RepoDetails> - the repository details
*/
async function getGithubInfo(owner, repo) {
    logger_1.log.info(`Entering getGithubInfo for ${owner}/${repo}`);
    logger_1.log.info(`In getGithubInfo, fetching repository details for ${owner}/${repo}`);
    // Fetch the repository details from GitHub
    const repoData = await limiter.schedule(() => _fetchRepoData(owner, repo));
    logger_1.log.info(`In getGithubInfo, Repository details fetched for ${owner}/${repo}`);
    logger_1.log.info(`In getGithubInfo, fetching license information for ${owner}/${repo}`);
    // Fetch the license information for the repository
    const license = await limiter.schedule(() => _fetchLicense(repoData, owner, repo));
    logger_1.log.info(`In getGithubInfo, license information fetched for ${owner}/${repo}`);
    // Get the start date for the analysis (12 months ago or repository creation date, whichever is later)
    const currentDate = new Date();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(currentDate.getMonth() - 12);
    const startDate = twelveMonthsAgo;
    logger_1.log.info(`In getGithubInfo, fetching latest commits for ${owner}/${repo}`);
    // Fetch latest commits (up to 500 from the start date)
    let allCommits = [];
    for (let page = 1; page <= 5; page++) {
        const commits = (await limiter.schedule(() => _fetchLatestCommits(owner, repo, startDate, 100, page))) || [];
        allCommits = allCommits.concat(commits);
        if (commits.length < 100 ||
            new Date(commits[commits.length - 1].commit.author.date) < startDate) {
            break;
        }
    }
    logger_1.log.info(`In getGithubInfo, latest commits fetched for ${owner}/${repo}`);
    logger_1.log.info(`In getGithubInfo, fetching latest issues for ${owner}/${repo}`);
    // Fetch latest issues (up to 500 or from the start date)
    let allIssues = [];
    for (let page = 1; page <= 5; page++) {
        const issues = (await limiter.schedule(() => _fetchLatestIssues(owner, repo, 100, page, startDate))) || [];
        allIssues = allIssues.concat(issues);
        if (issues.length < 100 ||
            new Date(issues[issues.length - 1].createdAt) < startDate) {
            break;
        }
    }
    logger_1.log.info(`In getGithubInfo, latest issues fetched for ${owner}/${repo}`);
    logger_1.log.info(`In getGithubInfo, fetching contributors for ${owner}/${repo}`);
    // Fetch contributors data
    const contributorsData = await limiter.schedule(() => _fetchContributors(owner, repo));
    logger_1.log.info(`In getGithubInfo, contributors fetched for ${owner}/${repo}`);
    // Construct and populate the repository details object
    const repoDetails = {
        owner: owner,
        repo: repo,
        createdAt: repoData.createdAt,
        stars: repoData.stargazers_count,
        openIssues: allIssues.length,
        forks: repoData.forks_count,
        license: license,
        commitsData: allCommits,
        issuesData: allIssues,
        contributorsData: contributorsData.data,
    };
    logger_1.log.debug(`Repository details for ${owner}/${repo}:`, repoDetails);
    logger_1.log.info(`Exiting getGithubInfo for ${owner}/${repo}`);
    return repoDetails;
}
/*
  Function Name: _getRepoData
  Description: This function fetches the repository stats
  @params: owner: string - the owner of the repository
  @params: repo: string - the name of the repository
  @returns: Promise<any> - the repository data
*/
async function _fetchRepoData(owner, repo) {
    try {
        const url = `${GITHUB_API_URL}/${owner}/${repo}`;
        const response = await axios_1.default.get(url, {
            headers: {
                Authorization: `token ${process.env.GITHUB_TOKEN}`,
            },
        });
        return response.data;
    }
    catch (error) {
        _handleError(error, `Failed to fetch repository data for ${owner}/${repo}`);
    }
}
/*
  Function Name: _fetchLicense
  Description: This function fetches the license information for a repository
  @params: repoData: any - the repository data
  @params: owner: string - the owner of the repository
  @params: repo: string - the name of the repository
  @returns: Promise<string> - the license name
*/
async function _fetchLicense(repoData, owner, repo) {
    let license = repoData.license?.name || "No license";
    //const description = data.description || "No description";
    if (license === "No license" || license === "Other") {
        try {
            const licenseFromPackageJson = await _getLicenseFromPackageJson(owner, repo);
            if (licenseFromPackageJson) {
                license = licenseFromPackageJson;
            }
            else {
                // Fallback to checking the README for license
                const readmeUrl = `${GITHUB_API_URL}/${owner}/${repo}/readme`;
                const readmeResponse = await axios_1.default.get(readmeUrl, {
                    headers: {
                        Authorization: `token ${process.env.GITHUB_TOKEN}`,
                    },
                });
                if (readmeResponse.data.content) {
                    const readmeContent = Buffer.from(readmeResponse.data.content, "base64").toString("utf-8");
                    const licenseFromReadme = _extractLicenseFromReadme(readmeContent);
                    if (licenseFromReadme) {
                        license = licenseFromReadme;
                    }
                }
                else {
                    logger_1.log.error(`The README file for ${owner}/${repo} is empty or not found`);
                }
            }
        }
        catch (error) {
            _handleError(error, `Failed to fetch license for ${owner}/${repo}`);
        }
    }
    return license;
}
/*
  Function Name: _fetchLatestCommits
  Description: This function fetches the latest commits for a repository
  @params: owner: string - the owner of the repository
  @params: repo: string - the name of the repository
  @params: startDate: Date - the start date for the analysis
  @params: perPage: number - the number of commits per page
  @params: page: number - the page number for pagination
  @returns: Promise<any[]> - the list of commits
*/
async function _fetchLatestCommits(owner, repo, startDate, perPage = 100, page) {
    let commits = [];
    try {
        // Fetch a page of 100 commits
        const commitsResponse = await axios_1.default.get(`${GITHUB_API_URL}/${owner}/${repo}/commits`, {
            params: {
                per_page: perPage,
                page: page,
                since: startDate.toISOString(),
            },
            headers: {
                Authorization: `token ${process.env.GITHUB_TOKEN}`,
            },
        });
        commits = commitsResponse.data;
    }
    catch (error) {
        _handleError(error, `Failed to fetch commits for ${owner}/${repo}`);
    }
    return commits;
}
/*
  Function Name: _fetchLatestIssues
  Description: This function fetches the latest issues for a repository
  @params: owner: string - the owner of the repository
  @params: repo: string - the name of the repository
  @params: perPage: number - the number of issues per page
  @params: page: number - the page number for pagination
  @params: startDate: string - the start date for the analysis
  @returns: Promise<any> - the list of issues
*/
async function _fetchLatestIssues(owner, repo, perPage, page, startDate) {
    try {
        const issuesResponse = await axios_1.default.get(`${GITHUB_API_URL}/${owner}/${repo}/issues`, {
            params: {
                state: "all",
                per_page: perPage,
                page: page,
                since: startDate,
            },
            headers: {
                Authorization: `token ${process.env.GITHUB_TOKEN}`,
            },
        });
        return issuesResponse.data;
    }
    catch (error) {
        _handleError(error, `Failed to fetch issues for ${owner}/${repo}`);
    }
}
/*
  Function Name: _fetchContributors
  Description: This function fetches the contributors for a repository
  @params: owner: string - the owner of the repository
  @params: repo: string - the name of the repository
  @returns: Promise<any> - the list of contributors
*/
async function _fetchContributors(owner, repo) {
    try {
        const contributorsUrl = `${GITHUB_API_URL}/${owner}/${repo}/stats/contributors`;
        const contributorsData = await axios_1.default.get(contributorsUrl, {
            headers: {
                Authorization: `token ${process.env.GITHUB_TOKEN}`,
            },
        });
        return contributorsData;
    }
    catch (error) {
        _handleError(error, `Failed to fetch contributors for ${owner}/${repo}`);
    }
}
/*
  Function Name: _extractLicenseFromReadme
  Description: This function extracts the license information from the README file
  @params: readmeContent: string - the content of the README file
  @returns: string | null - the license name
*/
function _extractLicenseFromReadme(readmeContent) {
    // Updated regex to match all listed licenses
    const licenseRegex = new RegExp(Object.keys(licenseMap)
        .map((license) => `\\b${license}\\b`)
        .join("|"), "i");
    const match = readmeContent.match(licenseRegex);
    if (match) {
        return licenseMap[match[0]] || null; // Return the license name from the map if matched
    }
    return null;
}
/*
  Function Name: _getLicenseFromPackageJson
  Description: This function fetches the license information from the package.json file
  @params: owner: string - the owner of the repository
  @params: repo: string - the name of the repository
  @returns: Promise<string | null> - the license name
*/
async function _getLicenseFromPackageJson(owner, repo) {
    try {
        const packageJsonUrl = `${GITHUB_API_URL}/${owner}/${repo}/contents/package.json`;
        const packageResponse = await axios_1.default.get(packageJsonUrl, {
            headers: {
                Authorization: `token ${process.env.GITHUB_TOKEN}`,
            },
        });
        // Decode package.json content from base64
        if (packageResponse.data.content) {
            const packageContent = Buffer.from(packageResponse.data.content, "base64").toString("utf-8");
            const packageJson = JSON.parse(packageContent);
            // Return the license from package.json if it exists
            return packageJson.license || null;
        }
        return null;
    }
    catch (error) {
        logger_1.log.error(`Failed to fetch package.json for ${owner}/${repo}:`, error);
        return null;
    }
}
/*
  Helper Function: handleError
  Description: This function handles errors and logs appropriate messages
  @params: error: any - the error object
  @params: context: string - additional context information
*/
function _handleError(error, context) {
    logger_1.log.info(`Error occured in context: ${context}`);
    logger_1.log.info(`Processing error...`);
    if (axios_1.default.isAxiosError(error)) {
        if (error.response) {
            const status = error.response.status;
            if ((status == 403 || status == 429) &&
                error.response.headers["x-ratelimit-remaining"] === "0") {
                console.error(`Error: Rate limit exceeded.`);
            }
            else if (status == 401) {
                console.error("Error: Unauthorized. Invalid or missing GitHub Token.");
            }
            else if (status == 403) {
                console.error("Error: Forbidden. You do not have permission to access this resource.");
            }
            else if (status == 404) {
                console.error("Error: Not Found. Invalid URL.");
            }
            else if (status >= 400 && status < 500) {
                console.error(`Client error: ${status} - ${error.response.statusText}`);
            }
            else if (status >= 500 && status < 600) {
                console.error(`Server error: ${status} - ${error.response.statusText}`);
            }
            else {
                console.error(`HTTP error: ${status} - ${error.response.statusText}`);
            }
        }
        else if (error.request) {
            // Request was made but no response was received
            console.error("No response received:", error.request);
        }
        else {
            // Something happened in setting up the request
            console.error("Error in request setup:", error.message);
        }
    }
    else {
        // Non-Axios error
        console.error("Unexpected error:", error);
    }
    console.error("Context:", context);
    logger_1.log.info(`Exiting Error Handling...`);
    process.exit(1); // Exit the process with a return code 1
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2l0QXBpUHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9hcGlQcm9jZXNzL2dpdEFwaVByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTZjRSxzQ0FBYTtBQUNiLHdDQUFjO0FBQ2Qsc0NBQWE7QUFDYixrREFBbUI7QUFDbkIsZ0RBQWtCO0FBQ2xCLGdEQUFrQjtBQUNsQixvQ0FBWTtBQW5kZCw4RUFBOEU7QUFDOUUsK0NBQWlDO0FBQ2pDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLCtEQUErRDtBQUNoRixrREFBbUM7QUFDbkMsc0NBQWdDO0FBQ2hDLDREQUFvQztBQUVwQyxpQkFBaUI7QUFDakIsTUFBTSxjQUFjLEdBQUcsOEJBQThCLENBQUM7QUFFdEQsd0RBQXdEO0FBQ3hELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQzlCLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQztJQUMzRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUM7QUFFRCw2R0FBNkc7QUFDN0csTUFBTSxPQUFPLEdBQUcsSUFBSSxvQkFBVSxDQUFDO0lBQzdCLHNGQUFzRjtJQUN0RixhQUFhLEVBQUUsQ0FBQztJQUNoQixPQUFPLEVBQUUsR0FBRyxFQUFFLDZCQUE2QjtDQUM1QyxDQUFDLENBQUM7QUFnQkgsMkNBQTJDO0FBQzNDLE1BQU0sVUFBVSxHQUE4QjtJQUM1QyxTQUFTLEVBQUUsNEJBQTRCO0lBQ3ZDLFlBQVksRUFBRSxvQkFBb0I7SUFDbEMsY0FBYyxFQUFFLHNCQUFzQjtJQUN0QyxTQUFTLEVBQUUsNEJBQTRCO0lBQ3ZDLGNBQWMsRUFBRSxtQ0FBbUM7SUFDbkQsY0FBYyxFQUFFLHlDQUF5QztJQUN6RCxvQkFBb0IsRUFBRSw0QkFBNEI7SUFDbEQsY0FBYyxF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