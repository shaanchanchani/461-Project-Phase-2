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
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCorrectness = calculateCorrectness;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const logger_1 = require("../logger");
dotenv.config(); // Load environment variables from a .env file into process.env
/* @param metric: RepoDetails - the returned output from getGitRepoDetails
 *  @returns score between 0 and 1 evaluated from
 *  - test coverage score
 *  - static analysis score
 *  - issue ratio
 */
async function calculateCorrectness(metric, clonedPath) {
    if (!fs.existsSync(clonedPath)) {
        throw new Error("Cloned path does not exist");
    }
    // dynamic analysis: compute test coverage score
    const testCoverageScore = await _getCoverageScore(clonedPath);
    // compute static analysis score: wait for later
    // compute issue ratio
    const openToClosedIssueRatio = _computeOpenToClosedIssueRatio(metric);
    logger_1.log.info(`${metric.repo} - testCoverageScore: ${testCoverageScore}, openToClosedIssueRatio: ${openToClosedIssueRatio}`);
    return 0.5 * testCoverageScore + 0.5 * openToClosedIssueRatio;
}
//helpers
function _computeOpenToClosedIssueRatio(metric) {
    // Check if there are any commits available
    // Setting default Values
    let ratioClosedToOpenIssues = 0;
    // get date for 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    // get current date
    const currentDate = new Date();
    // constant value to convert time difference to weeks
    if (metric.issuesData.length == 0) {
        return 0;
    }
    // Determine the start date for the 6-month period (or less if not enough data)
    const dateEarliestIssue = new Date(metric.issuesData[metric.issuesData.length - 1].created_at);
    const startDateIssues = dateEarliestIssue > sixMonthsAgo ? dateEarliestIssue : sixMonthsAgo;
    // Calculate = number of issues closed in the past 6 months that were opened
    //             in the past 6 months / number of issues created in the past 6 months
    const issues = metric.issuesData;
    const issuesOpenedPast6Months = issues.filter((issue) => new Date(issue.created_at) >= startDateIssues);
    const closedIssuesPast6Months = issuesOpenedPast6Months.filter((issue) => issue.state === "closed");
    if (!(issuesOpenedPast6Months.length == 0 || closedIssuesPast6Months.length == 0)) {
        // Calculate avg week to close an issue
        ratioClosedToOpenIssues =
            closedIssuesPast6Months.length / issuesOpenedPast6Months.length;
        const millisecondsInAWeek = 1000 * 60 * 60 * 24 * 7;
    }
    return ratioClosedToOpenIssues;
}
/*  Searching the entire repo in BFS manner for the test and src folders
 *  @param directoryPath: string - the path of the directory to search
 *  @param targetFolderName: string - the name of the folder to search for
 *  @param maxDepth: number - the maximum depth to search for the folder: defalut to 2
 *  @returns string | null - the path of the test folder or null if not found
 * */
async function __findSrc(directoryPath, maxDepth = 2) {
    if (!fs.existsSync(directoryPath)) {
        return null;
    }
    // BFS for the src folder
    const srcPattern = /^(src|source|sources|lib|app|package|packages|main)$/;
    const queue = [
        { path: directoryPath, depth: 0 },
    ];
    while (queue.length > 0) {
        //deconstructing assignment that inits currentPath and currentDepth to the first element in the queue
        const { path: currentPath, depth: currentDepth } = queue.shift();
        const namesInFolder = await fs.promises.readdir(currentPath, {
            withFileTypes: true,
        });
        for (const folder of namesInFolder) {
            if (folder.isDirectory()) {
                if (srcPattern.test(folder.name)) {
                    const completePath = path.join(currentPath, folder.name);
                    logger_1.log.info(`In _findSrc, found source in ${completePath}`);
                    return completePath;
                }
                if (currentDepth < maxDepth) {
                    // enqueue current folder and assign depth for further search
                    queue.push({
                        path: path.join(currentPath, folder.name),
                        depth: currentDepth + 1,
                    });
                }
            }
        }
    }
    return null;
}
async function __findTest(directoryPath, maxDepth = 2) {
    const testPattern = /^(test|tests|spec|__tests__|__test__)$/;
    const queue = [
        { path: directoryPath, depth: 0 },
    ];
    while (queue.length > 0) {
        const { path: currentPath, depth: currentDepth } = queue.shift();
        const namesInFolder = await fs.promises.readdir(currentPath, {
            withFileTypes: true,
        });
        for (const folder of namesInFolder) {
            if (folder.isDirectory()) {
                if (testPattern.test(folder.name)) {
                    const completePath = path.join(currentPath, folder.name);
                    logger_1.log.info(`In __findTest, found test in ${completePath}`);
                    return completePath;
                }
                else if (currentDepth < maxDepth) {
                    // enqueue current folder and assign depth for further search
                    queue.push({
                        path: path.join(currentPath, folder.name),
                        depth: currentDepth + 1,
                    });
                }
            }
        }
    }
    return null;
}
async function __countFilesInDirectory(dirPath, count = 0) {
    // DO NOT "shell out": instead use the path or fs module to do file traversal
    if (fs.existsSync(dirPath)) {
        const filesList = await fs.promises.readdir(dirPath, {
            withFileTypes: true,
        }); // use readdir (an async method) to prevent blocking event loop
        for (const file of filesList) {
            if (file.isDirectory()) {
                // if file is a directory, descent into it with recursion and update count
                const subdirPath = path.join(dirPath, file.name);
                count = await __countFilesInDirectory(subdirPath, count);
            }
            else {
                count++;
            }
        }
    }
    return count;
}
async function _getCIFilesScore(clonedPath) {
    const ciFilesPattern = /^(.travis.yml|circle.yml|Jenkinsfile|azure-pipelines.yml|ci(-[a-z])*.yml)$/;
    async function searchDirectory(directory) {
        const filesInRepo = await fs.promises.readdir(directory, {
            withFileTypes: true,
        });
        for (const file of filesInRepo) {
            const fullPath = path.join(directory, file.name);
            if (file.isDirectory()) {
                const score = await searchDirectory(fullPath);
                if (score === 0.8) {
                    return 0.8; // Return immediately if a CI/CD file is found
                }
            }
            else if (ciFilesPattern.test(file.name)) {
                return 0.8; // Return 0.8 if a CI/CD file is found
            }
        }
        return 0; // Return 0 if no CI/CD files are found in this directory
    }
    return await searchDirectory(clonedPath);
}
/* @param clonedPath: string - the path of the cloned repository
 *  @returns number - the coverage score of the repository
 *  compute coverageScore specified by clonedPath based on the following criteria:
 * - presence of CI/CD configuration files
 * - ratio of test files to source files
 * formula(s) for calculation will differ based on the file structure of the repository, but must
 * ensure the coverageScore is between 0 and 1.
 * */
async function _getCoverageScore(clonedPath) {
    // Check for CI/CD configuration files
    let ciCdScore = await _getCIFilesScore(clonedPath); // should get 0 or 0.8
    logger_1.log.info(`CI/CD configuration file score: ${ciCdScore}`);
    // find test and src folders
    const [testFolderPath, srcFolderPath] = await Promise.all([
        __findTest(clonedPath),
        __findSrc(clonedPath),
    ]);
    if (srcFolderPath === null) {
        //something MUST be wrong if clonedPath specifies a package repo without a src folder but have CI/CD
        //files setup
        logger_1.log.error(`No src folder found in ${clonedPath}`);
        return 0;
    }
    if (testFolderPath === null) {
        //has a src folder but no test folder ⇒ coverageScore = 0
        logger_1.log.error(`No test folder found in ${clonedPath}`);
        return 0;
    }
    // compute the ratio of test files to source files
    const [numTests, numSrc] = await Promise.all([
        __countFilesInDirectory(testFolderPath),
        __countFilesInDirectory(srcFolderPath),
    ]);
    let repoScore = 0;
    // handle if there are more tests than source files
    if (numTests > numSrc) {
        // when there are more tests than source files: first gauge how much more tests  there are than source files
        // then compute "penalty" for having more tests
        let penaltyRatio = (numTests - numSrc) / numSrc;
        if (penaltyRatio > 1) {
            //unreasonably many tests compared to source files
            repoScore = 0;
        }
        else {
            repoScore += 0.2 * (1 - penaltyRatio);
        }
    }
    else {
        repoScore += 0.2 * (numTests / numSrc);
    }
    // final coverage score calculation
    let coverageScore = 0;
    if (ciCdScore === 0.8) {
        // if trhere are CI/CD configuration files
        coverageScore = ciCdScore + repoScore;
    }
    else {
        // use the entire (not weighted) repoScore as the coverage score
        coverageScore = repoScore / 0.2;
    }
    return coverageScore;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ycmVjdG5lc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbWV0cmljcy9jb3JyZWN0bmVzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa1JTLG9EQUFvQjtBQWhSN0IsdUNBQXlCO0FBRXpCLDJDQUE2QjtBQUM3QiwrQ0FBaUM7QUFDakMsc0NBQWdDO0FBQ2hDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLCtEQUErRDtBQUVoRjs7Ozs7R0FLRztBQUNILEtBQUssVUFBVSxvQkFBb0IsQ0FDakMsTUFBbUIsRUFDbkIsVUFBa0I7SUFFbEIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztRQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELGdEQUFnRDtJQUNoRCxNQUFNLGlCQUFpQixHQUFHLE1BQU0saUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFOUQsZ0RBQWdEO0lBRWhELHNCQUFzQjtJQUN0QixNQUFNLHNCQUFzQixHQUFHLDhCQUE4QixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RFLFlBQUcsQ0FBQyxJQUFJLENBQ04sR0FBRyxNQUFNLENBQUMsSUFBSSx5QkFBeUIsaUJBQWlCLDZCQUE2QixzQkFBc0IsRUFBRSxDQUM5RyxDQUFDO0lBQ0YsT0FBTyxHQUFHLEdBQUcsaUJBQWlCLEdBQUcsR0FBRyxHQUFHLHNCQUFzQixDQUFDO0FBQ2hFLENBQUM7QUFFRCxTQUFTO0FBQ1QsU0FBUyw4QkFBOEIsQ0FBQyxNQUFtQjtJQUN6RCwyQ0FBMkM7SUFDM0MseUJBQXlCO0lBQ3pCLElBQUksdUJBQXVCLEdBQUcsQ0FBQyxDQUFDO0lBRWhDLDRCQUE0QjtJQUM1QixNQUFNLFlBQVksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ2hDLFlBQVksQ0FBQyxRQUFR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