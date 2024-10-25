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
exports.calculateBusFactor = calculateBusFactor;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const logger_1 = require("../logger");
/*
  Function Name: calculateBusFactor
  Description: This function calculates the bus factor of a repository
  @params: metrics: RepoDetails - the returned output from getGithubInfo(...)
  @returns: score between 0 and 1 evaluated from:
  - commit history by user name
*/
function calculateBusFactor(metrics) {
    logger_1.log.info("In calculateBusFactor, starting to calculate bus factor...");
    // Calculating total contributors and total commits
    let totalContributors = metrics.contributorsData.length;
    // Check if there are any contributors available + corner case for 1 contributor
    if (totalContributors == 0 || totalContributors == 1) {
        if (totalContributors == 1) {
            logger_1.log.debug("Bus factor is 1 as there is only 1 contributor");
        }
        else {
            logger_1.log.debug("No contributors available for bus factor calculation");
        }
        return 0;
    }
    let totalCommits = 0;
    for (let i = 0; i < metrics.contributorsData.length; i++) {
        const contributor = metrics.contributorsData[i];
        totalCommits += contributor.total || 0;
    }
    // Check if there are any commits available
    if (totalCommits == 0) {
        logger_1.log.debug("No commits available for bus factor calculation");
        return 0;
    }
    logger_1.log.debug("Total Commits before removing outliers:", totalCommits);
    logger_1.log.debug("Total Contributors before removing outliers:", totalContributors);
    // Sort contributors in descending order of commits
    let sortedCommitCounts = metrics.contributorsData.sort((a, b) => b.total - a.total);
    // Filter out contributors with less than 0.5% of total commits -> outliers
    sortedCommitCounts = sortedCommitCounts.filter((contributor) => contributor.total >= 0.005 * totalCommits);
    // Update total commits and total contributors
    totalCommits = sortedCommitCounts.reduce((total, contributor) => total + contributor.total, 0);
    totalContributors = sortedCommitCounts.length;
    logger_1.log.debug("Total Commits after removing outliers:", totalCommits);
    logger_1.log.debug("Total Contributors after removing outliers:", totalContributors);
    // Evaluate Core Contributors
    let cumulativeContribution = 0;
    let numCoreContributors = 0;
    const threshold = 0.8;
    for (const contributor of sortedCommitCounts) {
        cumulativeContribution += contributor.total / totalCommits;
        numCoreContributors++;
        if (cumulativeContribution >= threshold) {
            break;
        }
    }
    logger_1.log.debug("Number of Core Contributors:", numCoreContributors);
    logger_1.log.debug("Total Contributors:", totalContributors);
    // Calculate coreContributorsratio, ensure the bus factor is between 0 and 1
    const coreContributorsRatio = Math.min(Math.max(numCoreContributors / (0.35 * totalContributors), 0), 1);
    // Debug statement for calculated bus factor
    logger_1.log.debug("Calculated Bus factor:", coreContributorsRatio);
    logger_1.log.info("Finished calculating bus factor. Exiting...");
    return coreContributorsRatio;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVzRmFjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL21ldHJpY3MvYnVzRmFjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFZQSxnREEyRUM7QUF2RkQsK0NBQWlDO0FBQ2pDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQixzQ0FBZ0M7QUFFaEM7Ozs7OztFQU1FO0FBQ0YsU0FBZ0Isa0JBQWtCLENBQUMsT0FBb0I7SUFDckQsWUFBRyxDQUFDLElBQUksQ0FBQyw0REFBNEQsQ0FBQyxDQUFDO0lBRXZFLG1EQUFtRDtJQUNuRCxJQUFJLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7SUFFeEQsZ0ZBQWdGO0lBQ2hGLElBQUksaUJBQWlCLElBQUksQ0FBQyxJQUFJLGlCQUFpQixJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3JELElBQUksaUJBQWlCLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDM0IsWUFBRyxDQUFDLEtBQUssQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO1FBQzlELENBQUM7YUFBTSxDQUFDO1lBQ04sWUFBRyxDQUFDLEtBQUssQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUFFRCxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUM7SUFDckIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN6RCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDaEQsWUFBWSxJQUFJLFdBQVcsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCwyQ0FBMkM7SUFDM0MsSUFBSSxZQUFZLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDdEIsWUFBRyxDQUFDLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1FBQzdELE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQUVELFlBQUcsQ0FBQyxLQUFLLENBQUMseUNBQXlDLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDbkUsWUFBRyxDQUFDLEtBQUssQ0FBQyw4Q0FBOEMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBRTdFLG1EQUFtRDtJQUNuRCxJQUFJLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQ3BELENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUM1QixDQUFDO0lBQ0YsMkVBQTJFO0lBQzNFLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDLE1BQU0sQ0FDNUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxLQUFLLElBQUksS0FBSyxHQUFHLFlBQVksQ0FDM0QsQ0FBQztJQUNGLDhDQUE4QztJQUM5QyxZQUFZLEdBQUcsa0JBQWtCLENBQUMsTUFBTSxDQUN0QyxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxFQUNqRCxDQUFDLENBQ0YsQ0FBQztJQUNGLGlCQUFpQixHQUFHLGtCQUFrQixDQUFDLE1BQU0sQ0FBQztJQUU5QyxZQUFHLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ2xFLFlBQUcsQ0FBQyxLQUFLLENBQUMsNkNBQTZDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUU1RSw2QkFBNkI7SUFDN0IsSUFBSSxzQkFBc0IsR0FBRyxDQUFDLENBQUM7SUFDL0IsSUFBSSxtQkFBbUIsR0FBRyxDQUFDLENBQUM7SUFDNUIsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDO0lBQ3RCLEtBQUssTUFBTSxXQUFXLElBQUksa0JBQWtCLEVBQUUsQ0FBQztRQUM3QyxzQkFBc0IsSUFBSSxXQUFXLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQztRQUMzRCxtQkFBbUIsRUFBRSxDQUFDO1FBQ3RCLElBQUksc0JBQXNCLElBQUksU0FBUyxFQUFFLENBQUM7WUFDeEMsTUFBTTtRQUNSLENBQUM7SUFDSCxDQUFDO0lBRUQsWUFBRyxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBQy9ELFlBQUcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUVwRCw0RUFBNEU7SUFDNUUsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUNwQyxJQUFJLENBQUMsR0FBRyxDQUFDLG1CQUFtQixHQUFHLENBQUMsSUFBSSxHQUFHLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzdELENBQUMsQ0FDRixDQUFDO0lBRUYsNENBQTRDO0lBQzVDLFlBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQUUzRCxZQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxDQUFDLENBQUM7SUFDeEQsT0FBTyxxQkFBcUIsQ0FBQztBQUMvQixDQUFDIn0=