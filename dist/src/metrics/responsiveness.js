"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateResponsiveness = calculateResponsiveness;
const logger_1 = require("../logger");
/*
  Function Name: calculateResponsiveness
  Description: This function calculates the responsiveness score of a repository
  @params: metrics: RepoDetails - the returned output from getGithubInfo(...)
  @returns: score between 0 and 1 evaluated from:
  - ratio of closed to open issues
  - average weeks not lost x reciprocal weeks
  - commit frequency ratio
*/
function calculateResponsiveness(metrics) {
    logger_1.log.info("In calculateResponsiveness, starting to calculate responsiveness...");
    // Setting default Values
    let ratioClosedToOpenIssues = 0;
    let avgWeeksNotLostXReciprocalWeeks = 0;
    let commitFreqRatio = 0;
    let responsiveness = 0;
    // get date for 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    // get current date
    const currentDate = new Date();
    // constant value to convert time difference to weeks
    const millisecondsInAWeek = 1000 * 60 * 60 * 24 * 7;
    logger_1.log.info("In calculateResponsiveness, calculating commit frequency ratio...");
    // Check if there are any issues available
    logger_1.log.debug("Number of commits available:", metrics.commitsData.length);
    if (metrics.commitsData.length != 0) {
        // Determine the start date for the 6-month period (or less if not enough data)
        const dateEarliestCommit = new Date(metrics.commitsData[metrics.commitsData.length - 1].commit.author.date);
        // Set start date for commits
        const startDateCommits = dateEarliestCommit > sixMonthsAgo ? dateEarliestCommit : sixMonthsAgo;
        // Filter commits from the start date
        const commitsFromStartDate = metrics.commitsData.filter((commit) => new Date(commit.commit.author.date) >= startDateCommits);
        // calculate weeks difference between start date and current date for commits
        const weeksDifferenceCommits = _calculateWeeksDifference(currentDate, startDateCommits, millisecondsInAWeek);
        // calculate commit frequency ratio
        const baselineAvgCommitFreqPerWeek = 10;
        const avgCommitsPerWeek = commitsFromStartDate.length / weeksDifferenceCommits;
        commitFreqRatio = Math.min(Math.max(avgCommitsPerWeek / baselineAvgCommitFreqPerWeek, 0), 1);
    }
    logger_1.log.info("Finished calculating Commit Frequency Ratio:");
    logger_1.log.debug("Commit Frequency Ratio:", commitFreqRatio);
    logger_1.log.info("In calculateResponsiveness, calculating ratio of closed to open issues...");
    // Check if there are any issues available
    logger_1.log.debug("Number of issues available:", metrics.issuesData.length);
    if (metrics.issuesData.length != 0) {
        // Determine the start date for the 6-month period (or less if not enough data)
        const dateEarliestIssue = new Date(metrics.issuesData[metrics.issuesData.length - 1].created_at);
        const startDateIssues = dateEarliestIssue > sixMonthsAgo ? dateEarliestIssue : sixMonthsAgo;
        // Calculate = number of issues closed in the past 6 months that were opened
        //             in the past 6 months / number of issues created in the past 6 months
        const issues = metrics.issuesData;
        const issuesOpenedPast6Months = issues.filter((issue) => new Date(issue.created_at) >= startDateIssues);
        const closedIssuesPast6Months = issuesOpenedPast6Months.filter((issue) => issue.state === "closed");
        if (!(issuesOpenedPast6Months.length == 0 ||
            closedIssuesPast6Months.length == 0)) {
            // Calculate ratio of closed to open issues
            ratioClosedToOpenIssues = _calculateRatioClosedToOpenIssues(closedIssuesPast6Months, issuesOpenedPast6Months);
            // Calculate total time to close issues
            const totalTimeToCloseIssues = closedIssuesPast6Months.reduce((total, issue) => total +
                (new Date(issue.closed_at).getTime() -
                    new Date(issue.created_at).getTime()), 0);
            // Calculate avg week to close an issue
            const avgWeeksToCloseIssue = totalTimeToCloseIssues /
                millisecondsInAWeek /
                closedIssuesPast6Months.length;
            const weeksDifferenceIssues = _calculateWeeksDifference(currentDate, startDateIssues, millisecondsInAWeek);
            // calculate avg weeks not lost x reciprocal weeks
            avgWeeksNotLostXReciprocalWeeks =
                (weeksDifferenceIssues - avgWeeksToCloseIssue) *
                    (1 / weeksDifferenceIssues);
        }
    }
    logger_1.log.info("Finished calculating Ratio of Closed to Open Issues");
    logger_1.log.debug("Ratio of Closed to Open Issues:", ratioClosedToOpenIssues);
    logger_1.log.debug("Average Weeks Not Lost * Reciprocal Weeks:", avgWeeksNotLostXReciprocalWeeks);
    // Calculate responsiveness score using weights
    responsiveness = Math.min(Math.max(0.5 * ratioClosedToOpenIssues +
        0.25 * avgWeeksNotLostXReciprocalWeeks +
        0.25 * commitFreqRatio, 0), 1);
    logger_1.log.debug("Calculated Responsive Maintainer Score:", responsiveness);
    logger_1.log.info("Finished calculateResponsiveness. Exiting...");
    return responsiveness;
}
/*
  Function Name: _calculateWeeksDifference
  Description: Helper function that calculates the number of weeks difference between the current date and the start date
  @params: currentDate: Date - current date
  @params: startDate: Date - start date
  @params: millisecondsInAWeek: number - constant value to convert time difference to weeks
  @returns: number of weeks difference between the current date and the start date
*/
function _calculateWeeksDifference(currentDate, startDate, millisecondsInAWeek) {
    const timeDifferenceCommits = currentDate.getTime() - startDate.getTime();
    let weeksDifference = timeDifferenceCommits / millisecondsInAWeek;
    if (weeksDifference < 1) {
        weeksDifference = 1;
    }
    return weeksDifference;
}
function _calculateRatioClosedToOpenIssues(closedIssuesPast6Months, issuesOpenedPast6Months) {
    return closedIssuesPast6Months.length / issuesOpenedPast6Months.length;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzcG9uc2l2ZW5lc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbWV0cmljcy9yZXNwb25zaXZlbmVzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQVlBLDBEQStJQztBQTFKRCxzQ0FBZ0M7QUFFaEM7Ozs7Ozs7O0VBUUU7QUFDRixTQUFnQix1QkFBdUIsQ0FBQyxPQUFvQjtJQUMxRCxZQUFHLENBQUMsSUFBSSxDQUNOLHFFQUFxRSxDQUN0RSxDQUFDO0lBRUYseUJBQXlCO0lBQ3pCLElBQUksdUJBQXVCLEdBQUcsQ0FBQyxDQUFDO0lBQ2hDLElBQUksK0JBQStCLEdBQUcsQ0FBQyxDQUFDO0lBQ3hDLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQztJQUN4QixJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUM7SUFFdkIsNEJBQTRCO0lBQzVCLE1BQU0sWUFBWSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFDaEMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFFbkQsbUJBQW1CO0lBQ25CLE1BQU0sV0FBVyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFDL0IscURBQXFEO0lBQ3JELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUVwRCxZQUFHLENBQUMsSUFBSSxDQUFDLG1FQUFtRSxDQUFDLENBQUM7SUFDOUUsMENBQTBDO0lBQzFDLFlBQUcsQ0FBQyxLQUFLLENBQUMsOEJBQThCLEVBQUUsT0FBTyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0RSxJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3BDLCtFQUErRTtRQUMvRSxNQUFNLGtCQUFrQixHQUFHLElBQUksSUFBSSxDQUNqQyxPQUFPLENBQUMsV0FB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