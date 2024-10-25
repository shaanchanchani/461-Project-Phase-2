"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlType = void 0;
exports.checkUrlType = checkUrlType;
exports.convertSshToHttps = convertSshToHttps;
exports.extractOwnerAndRepo = extractOwnerAndRepo;
exports.extractPackageNameFromUrl = extractPackageNameFromUrl;
exports.processUrl = processUrl;
const npmApiProcess_1 = require("../apiProcess/npmApiProcess");
const logger_1 = require("../logger");
// Enum for URL types
var UrlType;
(function (UrlType) {
    UrlType["GitHub"] = "github";
    UrlType["npm"] = "npm";
    UrlType["Invalid"] = "invalid";
})(UrlType || (exports.UrlType = UrlType = {}));
/*
  Function Name: checkUrlType
  Description: Determines whether a URL is a GitHub, npm, or invalid URL based on patterns.
  @params:
    - url: string - The URL to check.
  @returns: UrlType - Returns the type of the URL (GitHub, npm, or Invalid).
*/
function checkUrlType(url) {
    logger_1.log.info(`Checking URL type for: ${url}`);
    const githubPattern = /^(https?:\/\/)?(www\.)?github\.com\/[^\/]+\/[^\/]+/;
    const npmPattern = /^(https?:\/\/)?(www\.)?npmjs\.com\/package\/[^\/]+/;
    if (githubPattern.test(url)) {
        logger_1.log.info(`URL identified as GitHub URL.`);
        return UrlType.GitHub;
    }
    else if (npmPattern.test(url)) {
        logger_1.log.info(`URL identified as npm URL.`);
        return UrlType.npm;
    }
    else {
        logger_1.log.warn(`Invalid URL type detected.`);
        return UrlType.Invalid;
    }
}
/*
  Function Name: convertSshToHttps
  Description: Converts a GitHub SSH URL to its HTTPS equivalent.
  @params:
    - sshUrl: string - The SSH URL to convert.
  @returns: string - Returns the HTTPS version of the URL.
*/
function convertSshToHttps(sshUrl) {
    logger_1.log.info(`Converting SSH URL to HTTPS: ${sshUrl}`);
    if (sshUrl.startsWith("ssh://git@github.com/") ||
        sshUrl.startsWith("git@github.com:")) {
        const httpsUrl = sshUrl
            .replace(/^ssh:\/\/git@github.com\//, "https://github.com/")
            .replace(/^git@github.com:/, "https://github.com/")
            .replace(/\.git$/, "");
        logger_1.log.info(`Converted SSH URL to HTTPS: ${httpsUrl}`);
        return httpsUrl;
    }
    logger_1.log.info(`Input URL is not an SSH URL, returning original: ${sshUrl}`);
    return sshUrl;
}
/*
  Function Name: extractOwnerAndRepo
  Description: Extracts the owner and repo name from a GitHub URL.
  @params:
    - gitHubUrl: string - The GitHub URL.
  @returns: RepoInfo - An object containing the owner and repo.
  @throws: Error if the URL is invalid.
*/
function extractOwnerAndRepo(gitHubUrl) {
    logger_1.log.info(`Extracting owner and repo from GitHub URL: ${gitHubUrl}`);
    const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = gitHubUrl.match(regex);
    if (!match || match.length < 3) {
        logger_1.log.error("Invalid GitHub URL - unable to extract owner and repo.");
        process.exit(1);
    }
    const owner = match[1];
    const repo = match[2];
    logger_1.log.info(`Extracted owner: ${owner}, repo: ${repo}`);
    return { owner, repo };
}
/*
  Function Name: extractPackageNameFromUrl
  Description: Extracts the npm package name or GitHub repo name from a URL.
  @params:
    - url: string - The npm or GitHub URL.
  @returns: string - Returns the package or repo name.
  @throws: Error if the URL is invalid.
*/
function extractPackageNameFromUrl(url) {
    logger_1.log.info(`Extracting package name from URL: ${url}`);
    const trimmedUrl = url.trim();
    // Regex to match npm package URL
    const npmRegex = /https:\/\/www\.npmjs\.com\/package\/([^\/]+)/;
    const npmMatch = trimmedUrl.match(npmRegex);
    if (npmMatch && npmMatch.length >= 2) {
        logger_1.log.info(`Extracted npm package name: ${npmMatch[1]}`);
        return npmMatch[1];
    }
    // Regex to match GitHub URL
    const githubRegex = /https:\/\/github\.com\/([^\/]+\/[^\/]+)/;
    const githubMatch = trimmedUrl.match(githubRegex);
    if (githubMatch) {
        const { repo } = extractOwnerAndRepo(url);
        logger_1.log.info(`Extracted GitHub repo name: ${repo}`);
        return repo;
    }
    console.error("Invalid URL - unable to extract package name.");
    process.exit(1);
}
/*
  Function Name: processUrl
  Description: Processes the provided URL to extract GitHub repository information based on its type.
  @params:
    - UrlType: "github" | "npm" | "invalid" - The type of the URL.
    - url: string - The URL to process.
  @returns: Promise<RepoInfo> - Returns a promise that resolves to the repository info (owner and repo).
  @throws: Error if the URL type is invalid.
*/
async function processUrl(UrlType, url) {
    logger_1.log.info(`Processing URL of type: ${UrlType}, URL: ${url}`);
    if (UrlType === "invalid") {
        logger_1.log.error("Invalid URL type, cannot process.");
        process.exit(1);
    }
    let owner = "";
    let repo = "";
    if (UrlType === "npm") {
        logger_1.log.info("Extracting npm package and corresponding GitHub repo...");
        const packageName = extractPackageNameFromUrl(url);
        const giturl = await (0, npmApiProcess_1.getGitHubRepoFromNpmUrl)(packageName);
        const httpsUrl = convertSshToHttps(giturl);
        ({ owner, repo } = extractOwnerAndRepo(httpsUrl ?? ""));
    }
    else if (UrlType === "github") {
        logger_1.log.info("Processing GitHub URL...");
        ({ owner, repo } = extractOwnerAndRepo(url));
    }
    logger_1.log.info(`Successfully processed URL. Owner: ${owner}, Repo: ${repo}`);
    return { owner, repo };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsVXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvdXRpbHMvdXJsVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBdUJBLG9DQWdCQztBQVNELDhDQWtCQztBQVVELGtEQWVDO0FBVUQsOERBeUJDO0FBV0QsZ0NBMkJDO0FBcEtELCtEQUFzRTtBQUN0RSxzQ0FBZ0M7QUFFaEMscUJBQXFCO0FBQ3JCLElBQVksT0FJWDtBQUpELFdBQVksT0FBTztJQUNqQiw0QkFBaUIsQ0FBQTtJQUNqQixzQkFBVyxDQUFBO0lBQ1gsOEJBQW1CLENBQUE7QUFDckIsQ0FBQyxFQUpXLE9BQU8sdUJBQVAsT0FBTyxRQUlsQjtBQVFEOzs7Ozs7RUFNRTtBQUNGLFNBQWdCLFlBQVksQ0FBQyxHQUFXO0lBQ3RDLFlBQUcsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFFMUMsTUFBTSxhQUFhLEdBQUcsb0RBQW9ELENBQUM7SUFDM0UsTUFBTSxVQUFVLEdBQUcsb0RBQW9ELENBQUM7SUFFeEUsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDNUIsWUFBRyxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQzFDLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQztJQUN4QixDQUFDO1NBQU0sSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDaEMsWUFBRyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQztJQUNyQixDQUFDO1NBQU0sQ0FBQztRQUNOLFlBQUcsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUN2QyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUM7SUFDekIsQ0FBQztBQUNILENBQUM7QUFFRDs7Ozs7O0VBTUU7QUFDRixTQUFn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