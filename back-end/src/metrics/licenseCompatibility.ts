// Check if package contains valid license
import { RepoDetails } from "../apiProcess/gitApiProcess";
import { log } from "../logger";

interface LicenseDefinition {
  name: string;
  pattern?: RegExp;
  patterns?: RegExp[];
  score?: number;
}

// Define compatible licenses with their patterns
const COMPATIBLE_LICENSES: LicenseDefinition[] = [
  { name: 'MIT', pattern: /\bMIT\b/i, score: 1.0 },
  { 
    name: 'Apache-2.0',
    patterns: [
      /\bAPACHE(?:[-\s]+LICENSE)?(?:[-\s]+V(?:ERSION)?)?[-\s]*2(?:\.0)?\b/i,
      /\bAPACHE[-\s]2\.0\b/i
    ],
    score: 1.0 
  },
  { 
    name: 'GPL-3.0', 
    patterns: [
      /\bGPL[\s-]?(?:V(?:ERSION)?\s*)?3(?:\.0)?\b/i,
      /\bGNU\s+GENERAL\s+PUBLIC\s+LICENSE\s+(?:V(?:ERSION)?\s*)?3(?:\.0)?\b/i
    ],
    score: 0.9
  },
  { 
    name: 'GPL-2.0', 
    patterns: [
      /\bGPL[\s-]?(?:V(?:ERSION)?\s*)?2(?:\.0)?\b/i,
      /\bGNU\s+GENERAL\s+PUBLIC\s+LICENSE\s+(?:V(?:ERSION)?\s*)?2(?:\.0)?\b/i
    ],
    score: 0.9
  },
  { name: 'BSD-3-Clause', pattern: /\bBSD[\s-]3[\s-]CLAUSE\b/i, score: 1.0 },
  { name: 'BSD-2-Clause', pattern: /\bBSD[\s-]2[\s-]CLAUSE\b/i, score: 1.0 },
  { 
    name: 'LGPL-2.1', 
    patterns: [
      /\bLGPL[\s-]?(?:V(?:ERSION)?\s*)?2\.1\b/i,
      /\bGNU\s+LESSER\s+GENERAL\s+PUBLIC\s+LICENSE\s+(?:V(?:ERSION)?\s*)?2\.1\b/i
    ],
    score: 0.9
  },
  { name: 'Zlib', pattern: /\bZLIB\b/i, score: 1.0 }
];

/*
  Function Name: calculateLicenseCompatibility
  Description: This function calculates the license compatibility score for a repository based on the license found in the `RepoDetails`.
  @params: 
    - metrics: RepoDetails - The repository details containing the license information.
  @returns: number - The license compatibility score based on the license, or 0 if no valid license is found.
*/
export function calculateLicenseCompatibility(metrics: RepoDetails): number {
  log.info(`Calculating license compatibility...`);
  const license = metrics.license;

  if (!license) {
    log.info(`No license found. Exiting...`);
    return 0;
  }

  // First try exact SPDX match
  const matchingLicense = COMPATIBLE_LICENSES.find(l => l.name.toLowerCase() === license.toLowerCase());
  if (matchingLicense) {
    log.info(`Found exact SPDX match: ${license}`);
    return matchingLicense.score || 0;
  }

  // Check each license definition
  for (const licenseDefinition of COMPATIBLE_LICENSES) {
    // Check single pattern if it exists
    if (licenseDefinition.pattern && licenseDefinition.pattern.test(license)) {
      log.info(`Found license match: ${license} matches pattern for ${licenseDefinition.name}`);
      return licenseDefinition.score || 0;
    }
    
    // Check multiple patterns if they exist
    if (licenseDefinition.patterns) {
      for (const pattern of licenseDefinition.patterns) {
        if (pattern.test(license)) {
          log.info(`Found license match: ${license} matches pattern for ${licenseDefinition.name}`);
          return licenseDefinition.score || 0;
        }
      }
    }
  }

  // If no match found yet, try extracting SPDX identifier
  const spdxMatch = license.match(/\b[A-Z0-9\-\.]+\b/g);
  if (spdxMatch) {
    const spdxId = spdxMatch[0];
    log.info(`Extracted SPDX identifier: ${spdxId}`);
    
    // Check if this SPDX ID matches any license name
    const matchingBySpdx = COMPATIBLE_LICENSES.find(l => l.name.toLowerCase() === spdxId.toLowerCase());
    if (matchingBySpdx) {
      log.info(`Found SPDX match: ${spdxId} matches ${matchingBySpdx.name}`);
      return matchingBySpdx.score || 0;
    }
  }

  log.info(`No valid license match found for "${license}". Exiting...`);
  return 0;
}
