//Contains functions to interact with the GitHub API and process the responses
import * as dotenv from "dotenv";
dotenv.config(); // Load environment variables from a .env file into process.env
import axios, { all } from "axios";
import { log } from "../logger";
import Bottleneck from "bottleneck";

// GitHub API URL
const GITHUB_API_URL = "https://api.github.com/repos";

// Check if the GITHUB_TOKEN environment variable is set
if (!process.env.GITHUB_TOKEN) {
  console.error("GITHUB_TOKEN environment variable not set");
  process.exit(1);
}

// Rate limiter to prevent hitting the GitHub API rate limit (5000 requests per hour for authenticated users)
const limiter = new Bottleneck({
  // Allow 3 concurrent requests
  maxConcurrent: 3,
  // 100ms between requests per concurrent slot (30 requests per second total max)
  minTime: 100,
});

// Repository details interface
export interface RepoDetails {
  owner: string;
  repo: string;
  createdAt: string;
  stars: number;
  openIssues: number;
  forks: number;
  license: string | null;
  commitsData: any[];
  issuesData: any[];
  contributorsData: any[];
}

// Map of license names to their full names
const licenseMap: { [key: string]: string } = {
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
async function getGithubInfo(
  owner: string,
  repo: string,
): Promise<RepoDetails> {
  log.info(`Entering getGithubInfo for ${owner}/${repo}`);

  // Get the start date for the analysis (12 months ago or repository creation date, whichever is later)
  const currentDate = new Date();
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(currentDate.getMonth() - 12);
  const startDate = twelveMonthsAgo;

  // Fetch data in parallel where possible
  const [repoData, contributorsData] = await Promise.all([
    limiter.schedule(() => _fetchRepoData(owner, repo)),
    limiter.schedule(() => _fetchContributors(owner, repo))
  ]);

  // Fetch license after repo data since it might need it
  const license = await limiter.schedule(() => _fetchLicense(repoData, owner, repo));

  // Fetch commits and issues in parallel
  const [allCommits, allIssues] = await Promise.all([
    (async () => {
      let commits: any[] = [];
      for (let page = 1; page <= 5; page++) {
        const pageCommits = await limiter.schedule(() => 
          _fetchLatestCommits(owner, repo, startDate, 100, page)
        ) || [];
        commits = commits.concat(pageCommits);
        if (pageCommits.length < 100 || 
            new Date(pageCommits[pageCommits.length - 1].commit.author.date) < startDate) {
          break;
        }
      }
      return commits;
    })(),
    (async () => {
      let issues: any[] = [];
      for (let page = 1; page <= 5; page++) {
        const pageIssues = await limiter.schedule(() =>
          _fetchLatestIssues(owner, repo, 100, page, startDate)
        ) || [];
        issues = issues.concat(pageIssues);
        if (pageIssues.length < 100 ||
            new Date(pageIssues[pageIssues.length - 1].createdAt) < startDate) {
          break;
        }
      }
      return issues;
    })()
  ]);

  // Construct and populate the repository details object
  const repoDetails: RepoDetails = {
    owner: owner,
    repo: repo,
    createdAt: repoData.createdAt,
    stars: repoData.stargazers_count,
    openIssues: allIssues.length,
    forks: repoData.forks_count,
    license: license,
    commitsData: allCommits,
    issuesData: allIssues,
    contributorsData: contributorsData,
  };
  log.debug(`Repository details for ${owner}/${repo}:`, repoDetails);

  log.info(`Exiting getGithubInfo for ${owner}/${repo}`);
  return repoDetails;
}

/*
  Function Name: _getRepoData
  Description: This function fetches the repository stats
  @params: owner: string - the owner of the repository
  @params: repo: string - the name of the repository
  @returns: Promise<any> - the repository data
*/
async function _fetchRepoData(owner: string, repo: string): Promise<any> {
  try {
    const url = `${GITHUB_API_URL}/${owner}/${repo}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });
    return response.data;
  } catch (error) {
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
async function _fetchLicense(
  repoData: any,
  owner: string,
  repo: string,
): Promise<string> {
  let license = repoData.license?.name || "No license";
  //const description = data.description || "No description";

  if (license === "No license" || license === "Other") {
    try {
      const licenseFromPackageJson = await _getLicenseFromPackageJson(
        owner,
        repo,
      );
      if (licenseFromPackageJson) {
        license = licenseFromPackageJson;
      } else {
        // Fallback to checking the README for license
        const readmeUrl = `${GITHUB_API_URL}/${owner}/${repo}/readme`;
        const readmeResponse = await axios.get(readmeUrl, {
          headers: {
            Authorization: `token ${process.env.GITHUB_TOKEN}`,
          },
        });

        if (readmeResponse.data.content) {
          const readmeContent = Buffer.from(
            readmeResponse.data.content,
            "base64",
          ).toString("utf-8");
          const licenseFromReadme = _extractLicenseFromReadme(readmeContent);
          if (licenseFromReadme) {
            license = licenseFromReadme;
          }
        } else {
          log.error(
            `The README file for ${owner}/${repo} is empty or not found`,
          );
        }
      }
    } catch (error) {
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
async function _fetchLatestCommits(
  owner: string,
  repo: string,
  startDate: Date,
  perPage: number = 100,
  page: number,
): Promise<any[]> {
  let commits: any[] = [];

  try {
    // Fetch a page of 100 commits
    const commitsResponse = await axios.get(
      `${GITHUB_API_URL}/${owner}/${repo}/commits`,
      {
        params: {
          per_page: perPage,
          page: page,
          since: startDate.toISOString(),
        },
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      },
    );
    commits = commitsResponse.data;
  } catch (error) {
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
async function _fetchLatestIssues(
  owner: string,
  repo: string,
  perPage: number,
  page: number,
  startDate: Date,
): Promise<any> {
  try {
    const issuesResponse = await axios.get(
      `${GITHUB_API_URL}/${owner}/${repo}/issues`,
      {
        params: {
          state: "all",
          per_page: perPage,
          page: page,
          since: startDate,
        },
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      },
    );
    return issuesResponse.data;
  } catch (error) {
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
async function _fetchContributors(owner: string, repo: string): Promise<any> {
  try {
    const contributorsUrl = `${GITHUB_API_URL}/${owner}/${repo}/contributors`;
    const response = await limiter.schedule(() => axios.get(contributorsUrl, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    }));
    return response.data || []; // Return just the data array, or empty array if no data
  } catch (error) {
    return _handleError(error, `Failed to fetch contributors for ${owner}/${repo}`);
  }
}

/*
  Function Name: _extractLicenseFromReadme
  Description: This function extracts the license information from the README file
  @params: readmeContent: string - the content of the README file
  @returns: string | null - the license name
*/
function _extractLicenseFromReadme(readmeContent: string): string | null {
  // Updated regex to match all listed licenses
  const licenseRegex = new RegExp(
    Object.keys(licenseMap)
      .map((license) => `\\b${license}\\b`)
      .join("|"),
    "i",
  );

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
async function _getLicenseFromPackageJson(
  owner: string,
  repo: string,
): Promise<string | null> {
  try {
    const packageJsonUrl = `${GITHUB_API_URL}/${owner}/${repo}/contents/package.json`;
    const packageResponse = await axios.get(packageJsonUrl, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });

    // Decode package.json content from base64
    if (packageResponse.data.content) {
      const packageContent = Buffer.from(
        packageResponse.data.content,
        "base64",
      ).toString("utf-8");
      const packageJson = JSON.parse(packageContent);

      // Return the license from package.json if it exists
      return packageJson.license || null;
    }
    return null;
  } catch (error) {
    log.error(`Failed to fetch package.json for ${owner}/${repo}:`, error);
    return null;
  }
}

// Custom error types for different GitHub API errors
export class GitHubRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubRateLimitError';
  }
}

export class GitHubAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubAuthError';
  }
}

export class GitHubNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubNotFoundError';
  }
}

export class GitHubClientError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'GitHubClientError';
  }
}

export class GitHubServerError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'GitHubServerError';
  }
}

/*
  Helper Function: handleError
  Description: This function handles errors and logs appropriate messages
  @params: error: any - the error object
  @params: context: string - additional context information
*/
function _handleError(error: any, context: string): never {
  log.info(`Error occured in context: ${context}`);
  log.info(`Processing error...`);
  
  let errorMessage = '';
  let customError: Error;
  
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status;
      if (
        (status == 403 || status == 429) &&
        error.response.headers["x-ratelimit-remaining"] === "0"
      ) {
        errorMessage = `Rate limit exceeded.`;
        customError = new GitHubRateLimitError(errorMessage);
      } else if (status == 401) {
        errorMessage = "Unauthorized. Invalid or missing GitHub Token.";
        customError = new GitHubAuthError(errorMessage);
      } else if (status == 403) {
        errorMessage = "Forbidden. You do not have permission to access this resource.";
        customError = new GitHubAuthError(errorMessage);
      } else if (status == 404) {
        errorMessage = "Not Found. Invalid URL.";
        customError = new GitHubNotFoundError(errorMessage);
      } else if (status >= 400 && status < 500) {
        errorMessage = `Client error: ${status} - ${error.response.statusText}`;
        customError = new GitHubClientError(errorMessage, status);
      } else if (status >= 500 && status < 600) {
        errorMessage = `Server error: ${status} - ${error.response.statusText}`;
        customError = new GitHubServerError(errorMessage, status);
      } else {
        errorMessage = `HTTP error: ${status} - ${error.response.statusText}`;
        customError = new Error(errorMessage);
      }
    } else if (error.request) {
      errorMessage = `No response received: ${error.request}`;
      customError = new Error(errorMessage);
    } else {
      errorMessage = `Error in request setup: ${error.message}`;
      customError = new Error(errorMessage);
    }
  } else {
    errorMessage = `Unexpected error: ${error}`;
    customError = new Error(errorMessage);
  }

  log.error(`${errorMessage} (Context: ${context})`);
  throw customError;
}

export {
  getGithubInfo,
  _fetchRepoData,
  _fetchLicense,
  _fetchLatestCommits,
  _fetchLatestIssues,
  _fetchContributors,
  _handleError,
};
