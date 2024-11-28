/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testMatch: ['<rootDir>/test/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'text'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.nvm/',
    '/dist/'
  ],
  modulePathIgnorePatterns: [
    '/.nvm/',
    '/node_modules/',
    '/dist/'
  ]
};