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
exports.calculateRampUpTime = calculateRampUpTime;
exports.checkReadme = checkReadme;
exports.checkInstallationInstructions = checkInstallationInstructions;
exports.calculateCodeCommentRatio = calculateCodeCommentRatio;
exports.getAllFiles = getAllFiles;
exports.countCommentLines = countCommentLines;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../logger");
/*
  Function Name: calculateRampUpTime
  Description: This function calculates the ramp-up time score of a repository based on the presence of a README,
               installation instructions, and the code-to-comment ratio.
  @params:
    - metrics: RepoDetails - The repository details used for scoring
    - dir: string - The directory where the repository is located
  @returns: number - The calculated ramp-up time score.
*/
async function calculateRampUpTime(metrics, dir) {
    try {
        logger_1.log.info(`Starting ramp-up time calculation for directory: ${dir}`);
        let score = 0;
        // Check for README file
        const readmeScore = checkReadme(dir) ? 0.1 : 0;
        logger_1.log.debug(`README file score: ${readmeScore}`); // Log the README score
        score += readmeScore;
        // Check for installation instructions
        const installScore = checkInstallationInstructions(dir) ? 0.4 : 0;
        logger_1.log.debug(`Installation instruction score: ${installScore}`); // Log the installation instructions score
        score += installScore;
        // Calculate code-to-comment ratio
        const codeCommentRatioScore = calculateCodeCommentRatio(dir);
        logger_1.log.debug(`Code-to-comment ratio score: ${codeCommentRatioScore}`); // Log the code-to-comment ratio score
        score += codeCommentRatioScore;
        logger_1.log.info(`Final ramp-up time score: ${score}`);
        return score;
    }
    catch (error) {
        logger_1.log.error("Error calculating ramp-up time:", error);
        return 0;
    }
}
/*
  Function Name: checkReadme
  Description: Checks whether the README file exists in the given directory.
  @params:
    - dir: string - The directory to search for a README file.
  @returns: boolean - True if a README file is found, false otherwise.
*/
function checkReadme(dir) {
    logger_1.log.info(`Checking for README file in directory: ${dir}`);
    const files = fs.readdirSync(dir);
    logger_1.log.debug(`Files found: ${files}`); // Log all files in the directory
    const readmeFiles = files.filter((file) => /^README(\.md|\.txt)?$/i.test(file));
    logger_1.log.debug(`README files found: ${readmeFiles.length}`); // Log the number of README files found
    return readmeFiles.length > 0;
}
/*
  Function Name: checkInstallationInstructions
  Description: Checks for installation instructions in README files in the given directory.
  @params:
    - dir: string - The directory to search for README files.
  @returns: boolean - True if installation instructions are found, false otherwise.
*/
function checkInstallationInstructions(dir) {
    logger_1.log.info(`Checking for installation instructions in README files in directory: ${dir}`);
    const files = fs.readdirSync(dir);
    const readmeFiles = files.filter((file) => /^README(\.md|\.txt)?$/i.test(file));
    logger_1.log.debug(`README files found for installation check: ${readmeFiles.length}`);
    const keywords = ["install", "test", "launch", "run", "example"];
    for (const readmeFile of readmeFiles) {
        const content = fs
            .readFileSync(path.join(dir, readmeFile), "utf8")
            .toLowerCase();
        logger_1.log.debug(`Checking README content for keywords: ${content}`);
        for (const keyword of keywords) {
            if (content.includes(keyword)) {
                logger_1.log.debug(`Installation instructions found with keyword: ${keyword}`);
                return true;
            }
        }
    }
    logger_1.log.debug("No installation instructions found.");
    return false;
}
/*
  Function Name: calculateCodeCommentRatio
  Description: Calculates the code-to-comment ratio score for the given directory.
  @params:
    - dir: string - The directory to search for code files.
  @returns: number - The calculated code-to-comment ratio score.
*/
function calculateCodeCommentRatio(dir) {
    logger_1.log.info("Calculating code-to-comment ratio score...");
    const allFiles = getAllFiles(dir);
    logger_1.log.debug(`Files found in directory for comment ratio calculation: ${allFiles}`);
    const codeExtensions = [
        ".js",
        ".ts",
        ".py",
        ".java",
        ".c",
        ".cpp",
        ".cs",
        ".rb",
        ".go",
        ".php",
        ".swift",
        ".kt",
        ".kts",
    ];
    const codeFiles = allFiles.filter((file) => codeExtensions.includes(path.extname(file).toLowerCase()));
    logger_1.log.debug(`Found ${codeFiles.length} code files for analysis.`);
    let totalLines = 0;
    let totalComments = 0;
    for (const file of codeFiles) {
        const content = fs.readFileSync(file, "utf8");
        const lines = content.split("\n");
        totalLines += lines.length;
        const ext = path.extname(file).toLowerCase();
        const commentsInFile = countCommentLines(lines, ext);
        totalComments += commentsInFile;
        logger_1.log.debug(`File: ${file}, Lines: ${lines.length}, Comments: ${commentsInFile}`);
    }
    if (totalLines === 0) {
        logger_1.log.debug("No lines of code found. Returning 0 for code-to-comment ratio.");
        return 0; // Avoid division by zero
    }
    const ratio = totalComments / (totalLines / 8);
    const normalizedRatio = Math.min(ratio, 1);
    const score = normalizedRatio * 0.5;
    logger_1.log.debug(`Total lines: ${totalLines}, Total comments: ${totalComments}, Ratio: ${ratio}, Normalized score: ${score}`);
    return score;
}
/*
  Function Name: getAllFiles
  Description: Recursively retrieves all files in a directory.
  @params:
    - dir: string - The directory to search for files.
    - files: string[] - An array of file paths.
    - visitedPaths: Set<string> - A set of visited paths to avoid cycles.
  @returns: string[] - An array of file paths.
*/
function getAllFiles(dir, files, visitedPaths) {
    files = files || [];
    visitedPaths = visitedPaths || new Set();
    logger_1.log.info(`Reading directory: ${dir}`);
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.posix.join(dir, entry.name); // Use posix to normalize path
        if (visitedPaths.has(fullPath)) {
            continue;
        }
        visitedPaths.add(fullPath);
        let stats;
        try {
            stats = fs.lstatSync(fullPath);
        }
        catch (err) {
            logger_1.log.error(`Error reading file stats for ${fullPath}: ${err}`);
            continue; // Skip this entry if there's an error
        }
        if (stats.isSymbolicLink()) {
            continue; // Skip symbolic links to avoid infinite loops
        }
        else if (stats.isDirectory()) {
            getAllFiles(fullPath, files, visitedPaths);
        }
        else if (stats.isFile()) {
            files.push(fullPath);
        }
    }
    return files;
}
/*
  Function Name: countCommentLines
  Description: Counts the number of comment lines in the given lines of code based on the file extension.
  @params:
    - lines: string[] - An array of lines of code.
    - ext: string - The file extension.
  @returns: number - The number of comment lines.
*/
function countCommentLines(lines, ext) {
    let singleLineComment = "//";
    let multiLineCommentStart = "/*";
    let multiLineCommentEnd = "*/";
    // Adjust comment syntax based on file extension
    switch (ext) {
        case ".py":
            singleLineComment = "#";
            multiLineCommentStart = `'''`;
            multiLineCommentEnd = `'''`;
            break;
        case ".rb":
            singleLineComment = "#";
            multiLineCommentStart = "=begin";
            multiLineCommentEnd = "=end";
            break;
        // Add more languages if needed
    }
    let inMultiLineComment = false;
    let commentLines = 0;
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (inMultiLineComment) {
            commentLines++;
            // Check if this line ends the multi-line comment
            if (trimmedLine === multiLineCommentEnd) {
                inMultiLineComment = false;
            }
        }
        else if (trimmedLine.startsWith(singleLineComment)) {
            // Count single-line comments
            commentLines++;
        }
        else if (trimmedLine === multiLineCommentStart) {
            // If the line only contains the start of the multi-line comment, count it and enter multi-line mode
            commentLines++;
            inMultiLineComment = true;
        }
        else if (trimmedLine.includes(multiLineCommentStart)) {
            // If the multi-line comment starts and ends on the same line, count it only once
            commentLines++;
            if (!trimmedLine.includes(multiLineCommentEnd)) {
                inMultiLineComment = true;
            }
        }
    }
    return commentLines;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFtcFVwVGltZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9tZXRyaWNzL3JhbXBVcFRpbWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWNBLGtEQTZCQztBQVNELGtDQVNDO0FBU0Qsc0VBMEJDO0FBU0QsOERBdURDO0FBV0Qsa0NBb0NDO0FBVUQsOENBaURDO0FBelFELHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0Isc0NBQWdDO0FBRWhDOzs7Ozs7OztFQVFFO0FBQ0ssS0FBSyxVQUFVLG1CQUFtQixDQUN2QyxPQUFvQixFQUNwQixHQUFXO0lBRVgsSUFBSSxDQUFDO1FBQ0gsWUFBRyxDQUFDLElBQUksQ0FBQyxvREFBb0QsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUNwRSxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7UUFFZCx3QkFBd0I7UUFDeEIsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQyxZQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsdUJBQXVCO1FBQ3ZFLEtBQUssSUFBSSxXQUFXLENBQUM7UUFFckIsc0NBQXNDO1FBQ3RDLE1BQU0sWUFBWSxHQUFHLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxZQUFHLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsMENBQTBDO1FBQ3hHLEtBQUssSUFBSSxZQUFZLENBQUM7UUFFdEIsa0NBQWtDO1FBQ2xDLE1BQU0scUJBQXFCLEdBQUcseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDN0QsWUFBRyxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MscUJB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