//src/metrics/netScore.ts
import { getGithubInfo, RepoDetails } from "../apiProcess/gitApiProcess";
import { calculateRampUpTime } from "./rampUpTime";
import { calculateResponsiveness } from "./responsiveness";
import { calculateLicenseCompatibility } from "./licenseCompatibility";
import { calculateBusFactor } from "./busFactor";
import { calculateCorrectness } from "./correctness";
import { calculatePinnedDependenciesMetric } from "./pinnedDependencies";
import { calculatePullRequestMetric } from "./reviewPullReqs";
import { cloneRepo, removeRepo } from "./clone_repo";
import * as fs from "fs";
import { log } from "../logger";

/*
  Function Name: measureLatency
  Description: Measures the time taken to execute a function and returns the value and latency in seconds.
  @params: 
    - fn: (...args: A) => Promise<T> | T - The function to measure latency for.
    - args: A[] - The arguments to pass to the function.
  @returns: Promise<{ value: T, latency: number }> - The function's result and the time taken in seconds.
*/
export async function measureLatency<T, A extends any[]>(
  fn: (...args: A) => Promise<T> | T,
  ...args: A
): Promise<{ value: T; latency: number }> {
  const startTime = process.hrtime();
  const value = await fn(...args);
  const elapsedTime = process.hrtime(startTime);
  const latency = elapsedTime[0] + elapsedTime[1] / 1e9; // Convert to seconds
  return { value, latency };
}

/*
  Function Name: GetNetScore
  Description: Retrieves various metrics (RampUp Time, Responsiveness, License Compatibility, Bus Factor, Correctness,
               Pinned Dependencies, Pull Request Reviews) for a GitHub repository, calculates the NetScore based on these metrics,
               and measures the time taken for each metric.
  @params: 
    - owner: string - The owner of the repository.
    - repo: string - The name of the repository.
    - url: string - The URL of the repository.
  @returns: Promise<any> - An object with calculated NetScore, individual metrics, and latency values.
*/
export async function GetNetScore(
  owner: string,
  repo: string,
  url: string,
): Promise<any> {
  const start = new Date().getTime();
  let dir: string | undefined;

  try {
    log.info(`Fetching GitHub repository data for ${owner}/${repo}`);
    const gitInfo = await getGithubInfo(owner, repo);
    if (!gitInfo) {
      log.error("Failed to retrieve repository info");
      return null;
    }

    let api_time = (new Date().getTime() - start) / 1000;
    const repoUrl = `https://github.com/${owner}/${repo}.git`;
    log.info(`Cloning repository from URL: ${repoUrl}`);

    const start_clone = new Date().getTime();
    const clonedPath = await cloneRepo(repoUrl);
    let clone_time = (new Date().getTime() - start_clone) / 1000;
    log.info(`Repository cloned to ${clonedPath}. Clone time: ${clone_time}s`);
    log.info(`Calculating repository metrics...`);
    
    const [rampUpTime, responsiveness] = await Promise.all([
      measureLatency(calculateRampUpTime, gitInfo, clonedPath),
      measureLatency(calculateResponsiveness, gitInfo),
    ]);

    const [licenseCompatibility, busFactor, correctnessScore] =
      await Promise.all([
        measureLatency(calculateLicenseCompatibility, gitInfo),
        measureLatency(calculateBusFactor, gitInfo),
        measureLatency(calculateCorrectness, gitInfo, clonedPath),
      ]);

    const [pinnedDependencies, pullRequestReview] = await Promise.all([
      measureLatency(calculatePinnedDependenciesMetric, gitInfo),
      measureLatency(calculatePullRequestMetric, gitInfo),
    ]);

    log.info(`Removing cloned repository from ${clonedPath}`);
    const removeResult = await removeRepo(clonedPath);
    if (!removeResult) {
      log.error("Failed to remove cloned repository");
      return null;
    }

    log.info(`Calculating final NetScore...`);
    const end = new Date().getTime();
    const total_time = (end - start) / 1000;

    const NetScore = Math.min(1, Math.max(0,
      0.15 * correctnessScore.value +
      0.15 * busFactor.value +
      0.1 * licenseCompatibility.value +
      0.2 * responsiveness.value +
      0.15 * rampUpTime.value +
      0.15 * pinnedDependencies.value +
      0.1 * pullRequestReview.value
    ));

    return {
      NetScore,
      BusFactor: busFactor.value,
      Correctness: correctnessScore.value,
      RampUp: rampUpTime.value,
      ResponsivenessScore: responsiveness.value,
      LicenseScore: licenseCompatibility.value,
      GoodPinningPractice: pinnedDependencies.value,
      PullRequest: pullRequestReview.value,
      total_time,
      api_time,
      clone_time,
      latencies: {
        BusFactorLatency: busFactor.latency,
        CorrectnessLatency: correctnessScore.latency,
        RampUpLatency: rampUpTime.latency,
        ResponsivenessLatency: responsiveness.latency,
        LicenseLatency: licenseCompatibility.latency,
        PinnedDependenciesLatency: pinnedDependencies.latency,
        PullRequestLatency: pullRequestReview.latency,
      },
    };
  } catch (error) {
    console.error(`GetNetScore: Failed to calculate metrics for ${url}`, error);
    return null;
  } finally {
    if (dir && fs.existsSync(dir)) {
      log.info(`Cleaning up: Removing directory ${dir}`);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}
