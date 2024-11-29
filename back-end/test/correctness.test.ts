import fs from "fs";
import path from "path";
import { calculateCorrectness } from "../src/metrics/correctness";
import { RepoDetails } from "../src/apiProcess/gitApiProcess";
import { log } from "../src/logger";

// Mock fs module
jest.mock("fs", () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  promises: {
    readdir: jest.fn().mockImplementation((path, options) => {
      // If withFileTypes is true, return Dirent-like objects
      if (options?.withFileTypes) {
        // The mock will be set up per test case to return appropriate Dirent-like objects
        return Promise.resolve([]);
      }
      // Otherwise just return file names
      return Promise.resolve([]);
    }),
    stat: jest.fn()
  }
}));

jest.mock("../src/logger", () => ({
  log: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe("calculateCorrectness with almost complete repository", () => {
  let metrics: RepoDetails;
  const clonedPath = "/mocked/cloned/path";

  beforeAll(() => {
    metrics = {
      owner: "owner",
      repo: "repo",
      createdAt: "2021-01-01",
      stars: 100,
      openIssues: 100,
      forks: 50,
      license: "MIT",
      commitsData: ["commitsData"],
      issuesData: [
        { number: "168", state: "open" },
        { number: "888", state: "closed" },
        { number: "666", state: "closed" },
      ],
      contributorsData: [
        { name: "Alice", total: 50 },
        { name: "Bob", total: 30 },
        { name: "Charlie", total: 20 },
      ],
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.promises.stat as jest.Mock).mockResolvedValue({ 
      isDirectory: () => false 
    });
  });

  it("should give a score >= 0.5 with a complete repo", async () => {
    const createDirent = (name: string, isDir: boolean) => ({
      name,
      isDirectory: () => isDir,
      isFile: () => !isDir,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      isSymbolicLink: () => false
    });

    const mockRootFiles = [
      createDirent('src', true),
      createDirent('test', true),
      createDirent('.travis.yml', false)
    ];

    const mockSrcFiles = [
      createDirent('file1.ts', false)
    ];

    const mockTestFiles = [
      createDirent('file1.test.ts', false)
    ];

    (fs.promises.readdir as jest.Mock)
      .mockImplementation((path, options) => {
        if (path.endsWith('src')) return Promise.resolve(mockSrcFiles);
        if (path.endsWith('test')) return Promise.resolve(mockTestFiles);
        return Promise.resolve(mockRootFiles);
      });

    const score = await calculateCorrectness(metrics, clonedPath);
    expect(score).toBeGreaterThanOrEqual(0.5);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("should score <= 0.5 if src/ is empty", async () => {
    const createDirent = (name: string, isDir: boolean) => ({
      name,
      isDirectory: () => isDir,
      isFile: () => !isDir,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      isSymbolicLink: () => false
    });

    const mockRootFiles = [
      createDirent('src', true),
      createDirent('test', true)
    ];

    const mockTestFiles = [
      createDirent('file1.test.ts', false)
    ];

    (fs.promises.readdir as jest.Mock)
      .mockImplementation((path, options) => {
        if (path.endsWith('src')) return Promise.resolve([]);
        if (path.endsWith('test')) return Promise.resolve(mockTestFiles);
        return Promise.resolve(mockRootFiles);
      });

    const score = await calculateCorrectness(metrics, clonedPath);
    expect(score).toBeLessThanOrEqual(0.5);
  });

  it("should score a 0 if src/ does not exist", async () => {
    const createDirent = (name: string, isDir: boolean) => ({
      name,
      isDirectory: () => isDir,
      isFile: () => !isDir,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      isSymbolicLink: () => false
    });

    const mockRootFiles = [
      createDirent('test', true)
    ];

    const mockTestFiles = [
      createDirent('file1.test.ts', false)
    ];

    (fs.promises.readdir as jest.Mock)
      .mockImplementation((path, options) => {
        if (path.endsWith('test')) return Promise.resolve(mockTestFiles);
        return Promise.resolve(mockRootFiles);
      });

    const score = await calculateCorrectness(metrics, clonedPath);
    expect(score).toBe(0);
  });

  it("should score a 0 if test/ does not exist", async () => {
    const createDirent = (name: string, isDir: boolean) => ({
      name,
      isDirectory: () => isDir,
      isFile: () => !isDir,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      isSymbolicLink: () => false
    });

    const mockRootFiles = [
      createDirent('src', true)
    ];

    const mockSrcFiles = [
      createDirent('file1.ts', false)
    ];

    (fs.promises.readdir as jest.Mock)
      .mockImplementation((path, options) => {
        if (path.endsWith('src')) return Promise.resolve(mockSrcFiles);
        return Promise.resolve(mockRootFiles);
      });

    const score = await calculateCorrectness(metrics, clonedPath);
    expect(score).toBe(0);
  });

  it("should handle CI/CD files correctly", async () => {
    const createDirent = (name: string, isDir: boolean) => ({
      name,
      isDirectory: () => isDir,
      isFile: () => !isDir,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      isSymbolicLink: () => false
    });

    const mockRootFiles = [
      createDirent('.github', true)
    ];

    const mockWorkflowsFiles = [
      createDirent('ci.yml', false)
    ];

    (fs.promises.readdir as jest.Mock)
      .mockImplementation((path, options) => {
        if (path.endsWith('.github/workflows')) return Promise.resolve(mockWorkflowsFiles);
        if (path.endsWith('.github')) return Promise.resolve([createDirent('workflows', true)]);
        return Promise.resolve(mockRootFiles);
      });

    const score = await calculateCorrectness(metrics, clonedPath);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});