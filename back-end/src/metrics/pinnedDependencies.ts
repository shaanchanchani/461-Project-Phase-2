import { RepoDetails } from "../apiProcess/gitApiProcess";
import { log } from "../logger";

/*
  Function Name: calculatePinnedDependenciesMetric
  Description: Calculates the pinned dependencies score of a repository
  @params: metrics: RepoDetails - the returned output from getGithubInfo(...)
  @returns: score between 0 and 1 evaluated from:
  - presence of package.json/package-lock.json
  - percentage of dependencies with exact versions
*/
export function calculatePinnedDependenciesMetric(metrics: RepoDetails): number {
    log.info("Starting to calculate pinned dependencies metric...");

    try {
        // Find package files
        const packageJson = metrics.files.find(file => file.path === 'package.json');
        const packageLock = metrics.files.find(file => file.path === 'package-lock.json');
        
        if (!packageJson) {
            log.debug("No package.json found");
            return 0;
        }

        try {
            // Parse package.json content
            const packageData = JSON.parse(packageJson.content);
            const dependencies = {
                ...(packageData.dependencies || {}),
                ...(packageData.devDependencies || {})
            };

            const totalDeps = Object.keys(dependencies).length;
            if (totalDeps === 0) {
                log.debug("No dependencies found in package.json");
                return 1; // No dependencies is technically "all pinned"
            }

            let pinnedCount = 0;

            // Check each dependency version
            Object.values(dependencies).forEach((version: any) => {
                const versionStr = String(version);
                
                // Consider a dependency pinned if:
                // - Exact version (e.g., "1.2.3")
                // - Git hash (40 char hex)
                // - Git URL with hash
                if (
                    /^\d+\.\d+\.\d+$/.test(versionStr) ||
                    /^[a-f0-9]{40}$/.test(versionStr) ||
                    /^git\+https:\/\/.*#[a-f0-9]{40}$/.test(versionStr)
                ) {
                    pinnedCount++;
                }
            });

            // Calculate base score
            let score = pinnedCount / totalDeps;
            
            // Bonus for having package-lock.json
            if (packageLock) {
                score = Math.min(1, score + 0.1);
            }

            log.debug(`Pinned dependencies metric: ${score.toFixed(3)} (${pinnedCount}/${totalDeps} deps pinned)`);
            return parseFloat(score.toFixed(3));

        } catch (error) {
            log.error("Error parsing package.json:", error);
            return 0;
        }
    } catch (error) {
        log.error("Error calculating pinned dependencies metric:", error);
        return 0;
    }
}