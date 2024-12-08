import * as dotenv from "dotenv";
dotenv.config();
import { RepoDetails } from "../apiProcess/gitApiProcess";
import { log } from "../logger";

/*
  Function Name: calculatePullRequestMetric
  Description: Calculates the pull request review score of a repository
  @params: metrics: RepoDetails - the returned output from getGithubInfo(...)
  @returns: score between 0 and 1 evaluated from:
  - ratio of reviewed vs unreviewed PRs
  - average number of reviewers per PR
  - presence of PR templates
*/
export function calculatePullRequestMetric(metrics: RepoDetails): number {
    log.info("Starting to calculate pull request review metric...");

    try {
        if (!metrics.pullRequests || metrics.pullRequests.length === 0) {
            log.debug("No pull requests found");
            return 0;
        }

        const totalPRs = metrics.pullRequests.length;
        let reviewedPRs = 0;
        let totalReviewers = 0;

        // Count reviewed PRs and total reviewers
        metrics.pullRequests.forEach(pr => {
            if (pr.reviews && pr.reviews.length > 0) {
                reviewedPRs++;
                totalReviewers += pr.reviews.length;
            }
        });

        // Calculate base score from review ratio
        const reviewRatio = reviewedPRs / totalPRs;
        
        // Calculate average reviewers per PR (max contribution of 0.3)
        const avgReviewers = totalPRs > 0 ? Math.min((totalReviewers / totalPRs) / 3, 1) : 0;
        const reviewerScore = avgReviewers * 0.3;

        // Check for PR template (0.1 bonus)
        const hasTemplate = metrics.pullRequests.some(pr => 
            pr.body?.includes('## Description') || // Common PR template sections
            pr.body?.includes('## Changes') ||
            pr.body?.includes('## Testing') ||
            pr.body?.includes('## Checklist')
        );

        // Calculate final score
        let score = (reviewRatio * 0.6) + reviewerScore;
        if (hasTemplate) {
            score = Math.min(1, score + 0.1);
        }

        log.debug(`Pull request review metric: ${score.toFixed(3)} (${reviewedPRs}/${totalPRs} PRs reviewed)`);
        return parseFloat(score.toFixed(3));
    } catch (error) {
        log.error("Error calculating pull request review metric:", error);
        return 0;
    }
}