import { calculateLicenseCompatibility } from "../src/metrics/licenseCompatibility";
import { log } from "../src/logger";
import { RepoDetails } from "../src/apiProcess/gitApiProcess";

// Mock the logger
jest.mock("../src/logger", () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("calculateLicenseCompatibility", () => {
  const { log } = require("../src/logger");

  beforeEach(() => {
    jest.clearAllMocks(); // Clear any previous mock calls
  });

  const testCases = [
    { license: 'MIT', expectedScore: 1.0, description: 'simple MIT' },
    { license: 'MIT License', expectedScore: 1.0, description: 'MIT with License suffix' },
    { license: 'The MIT License', expectedScore: 1.0, description: 'MIT with The prefix' },
    { license: 'Apache License 2.0', expectedScore: 1.0, description: 'Apache with spaces' },
    { license: 'Apache-2.0', expectedScore: 1.0, description: 'Apache with hyphen' },
    { license: 'GPL-3.0', expectedScore: 0.9, description: 'GPL v3 with hyphen' },
    { license: 'GNU General Public License v3.0', expectedScore: 0.9, description: 'GPL v3 full name' },
    { license: 'GPL-2.0', expectedScore: 0.9, description: 'GPL v2 with hyphen' },
    { license: 'GNU General Public License v2.0', expectedScore: 0.9, description: 'GPL v2 full name' },
    { license: 'BSD-3-Clause', expectedScore: 1.0, description: 'BSD 3-clause' },
    { license: 'BSD-2-Clause', expectedScore: 1.0, description: 'BSD 2-clause' },
    { license: 'LGPL-2.1', expectedScore: 0.9, description: 'LGPL 2.1' },
    { license: 'GNU Lesser General Public License v2.1', expectedScore: 0.9, description: 'LGPL 2.1 full name' },
    { license: 'Zlib', expectedScore: 1.0, description: 'Zlib license' },
    { license: 'Unknown License', expectedScore: 0, description: 'unknown license' },
    { license: null, expectedScore: 0, description: 'null license' },
  ];

  testCases.forEach(({ license, expectedScore, description }) => {
    it(`should return ${expectedScore} for ${description}`, () => {
      const repoDetails = {
        license,
        owner: "",
        repo: "",
        createdAt: "",
        stars: 0,
        openIssues: 0,
        forks: 0,
        commitsData: [],
        issuesData: [],
        contributorsData: [],
      } as RepoDetails;

      const score = calculateLicenseCompatibility(repoDetails);
      if (license === 'Apache-2.0') {
        console.log(`License: ${license}, Score: ${score}, Expected: ${expectedScore}`);
      }
      expect(score).toBe(expectedScore);
      expect(log.info).toHaveBeenCalledWith("Calculating license compatibility...");
    });
  });

  it("should handle case variations in license names", () => {
    const variations = [
      { input: "MIT", expected: 1.0 },
      { input: "mit", expected: 1.0 },
      { input: "Mit License", expected: 1.0 },
      { input: "MIT LICENSE", expected: 1.0 },
    ];

    variations.forEach(({ input, expected }) => {
      const repoDetails: RepoDetails = {
        license: input,
        owner: "",
        repo: "",
        createdAt: "",
        stars: 0,
        openIssues: 0,
        forks: 0,
        commitsData: [],
        issuesData: [],
        contributorsData: [],
      };

      const score = calculateLicenseCompatibility(repoDetails);
      expect(score).toBe(expected);
    });
  });

  it("should handle SPDX identifiers", () => {
    const spdxCases = [
      { input: "MIT", expected: 1.0 },
      { input: "Apache-2.0", expected: 1.0 },
      { input: "GPL-3.0", expected: 0.9 },
      { input: "BSD-3-Clause", expected: 1.0 },
    ];

    spdxCases.forEach(({ input, expected }) => {
      const repoDetails: RepoDetails = {
        license: input,
        owner: "",
        repo: "",
        createdAt: "",
        stars: 0,
        openIssues: 0,
        forks: 0,
        commitsData: [],
        issuesData: [],
        contributorsData: [],
      };

      const score = calculateLicenseCompatibility(repoDetails);
      expect(score).toBe(expected);
    });
  });
});
