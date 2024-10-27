export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
      '^.+\\.tsx?$': 'ts-jest',
    },
    testMatch: ['<rootDir>/test/*.test.ts'], // Only run test scripts in the test folder
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['json', 'text'],
  };