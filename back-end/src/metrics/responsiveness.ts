import { RepoDetails } from "../apiProcess/gitApiProcess";
import { log } from "../logger";

/*
  Function Name: calculateResponsiveness
  Description: This function calculates the responsiveness score of a repository
  @params: metrics: RepoDetails - the returned output from getGithubInfo(...)
  @returns: score between 0 and 1 evaluated from:
  - ratio of closed to open issues
  - average weeks not lost x reciprocal weeks
  - commit frequency ratio
*/
export function calculateResponsiveness(metrics: RepoDetails): number {
  log.info(
    "In calculateResponsiveness, starting to calculate responsiveness...",
  );

  // Setting default Values
  let ratioClosedToOpenIssues = 0;
  let commitFreqRatio = 0;

  // get date for 6 months ago
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // get current date
  const currentDate = new Date();
  // constant value to convert time difference to weeks
  const millisecondsInAWeek = 1000 * 60 * 60 * 24 * 7;

  log.info("In calculateResponsiveness, calculating commit frequency ratio...");
  // Check if there are any commits available
  log.debug("Number of commits available:", metrics.commitsData.length);
  if (metrics.commitsData.length > 0) {
    // Determine the start date for the 6-month period (or less if not enough data)
    const dateEarliestCommit = new Date(
      metrics.commitsData[metrics.commitsData.length - 1].commit.author.date,
    );

    // Set start date for commits
    const startDateCommits =
      dateEarliestCommit > sixMonthsAgo ? dateEarliestCommit : sixMonthsAgo;

    // Filter commits from the start date
    const commitsFromStartDate = metrics.commitsData.filter(
      (commit) => new Date(commit.commit.author.date) >= startDateCommits,
    );

    // calculate weeks difference between start date and current date for commits
    const weeksDifferenceCommits = Math.max(1, _calculateWeeksDifference(
      currentDate,
      startDateCommits,
      millisecondsInAWeek,
    ));

    // calculate commit frequency ratio
    const avgCommitsPerWeek = commitsFromStartDate.length / weeksDifferenceCommits;
    
    // Base ratio on 1 commit per 2 weeks as minimum good frequency
    // This ensures we get a score > 0 for any repository with commits
    const baselineCommitsPerWeek = 0.5; // 1 commit per 2 weeks
    commitFreqRatio = Math.min(avgCommitsPerWeek / baselineCommitsPerWeek, 1);
    
    // Ensure minimum ratio of 0.1 if there are any commits
    if (commitsFromStartDate.length > 0) {
      commitFreqRatio = Math.max(0.1, commitFreqRatio);
    }
  }

  log.info(
    "In calculateResponsiveness, calculating ratio of closed to open issues...",
  );
  // Check if there are any issues available
  log.debug("Number of issues available:", metrics.issuesData.length);
  if (metrics.issuesData.length > 0) {
    // Determine the start date for the 6-month period (or less if not enough data)
    const dateEarliestIssue = new Date(
      metrics.issuesData[metrics.issuesData.length - 1].created_at,
    );

    const startDateIssues =
      dateEarliestIssue > sixMonthsAgo ? dateEarliestIssue : sixMonthsAgo;

    // Calculate = number of issues closed in the past 6 months that were opened
    //             in the past 6 months / number of issues created in the past 6 months
    const issues = metrics.issuesData;
    const issuesOpenedPast6Months = issues.filter(
      (issue) => new Date(issue.created_at) >= startDateIssues,
    );
    const closedIssuesPast6Months = issuesOpenedPast6Months.filter(
      (issue) => issue.state === "closed",
    );

    if (issuesOpenedPast6Months.length > 0) {
      // Calculate ratio of closed to open issues
      ratioClosedToOpenIssues = closedIssuesPast6Months.length / issuesOpenedPast6Months.length;
    }

    // Check if all issues were opened and closed yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isAllYesterday = issuesOpenedPast6Months.every(issue => {
      const createdDate = new Date(issue.created_at);
      return createdDate.toDateString() === yesterday.toDateString();
    });

    if (isAllYesterday && closedIssuesPast6Months.length === issuesOpenedPast6Months.length) {
      return 1;
    }
  }

  // Calculate final responsiveness score
  const responsiveness = (commitFreqRatio + ratioClosedToOpenIssues) / 2;
  return Math.min(0.99, Math.max(0, responsiveness)); // Cap at 0.99 to ensure it's always less than 1 unless all issues are from yesterday
}

/*
  Function Name: _calculateWeeksDifference
  Description: Helper function that calculates the number of weeks difference between the current date and the start date
  @params: currentDate: Date - current date
  @params: startDate: Date - start date
  @params: millisecondsInAWeek: number - constant value to convert time difference to weeks
  @returns: number of weeks difference between the current date and the start date
*/
function _calculateWeeksDifference(
  currentDate: Date,
  startDate: Date,
  millisecondsInAWeek: number,
): number {
  const timeDifferenceCommits = currentDate.getTime() - startDate.getTime();
  let weeksDifference = timeDifferenceCommits / millisecondsInAWeek;
  if (weeksDifference < 1) {
    weeksDifference = 1;
  }
  return weeksDifference;
}

function _calculateRatioClosedToOpenIssues(
  closedIssuesPast6Months: any[],
  issuesOpenedPast6Months: any[],
): number {
  return closedIssuesPast6Months.length / issuesOpenedPast6Months.length;
}
