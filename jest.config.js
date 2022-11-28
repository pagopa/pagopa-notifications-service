module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules"],
  testMatch: [
    "**/__tests__/*.ts"
  ],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@dist/(.*)$': '<rootDir>/dist/$1'
  },
  setupFiles: ["<rootDir>/jest.setup.js"],
  collectCoverage: true,
  collectCoverageFrom: [
      "src/**/*.ts"
  ],
  coveragePathIgnorePatterns: [
      "node_modules",
      "test-config",
      ".module.ts",
      "<rootDir>/src/generated/",
      "<rootDir>/src/util/appInsights.ts",
  ],
  coverageDirectory: "<rootDir>/coverage/",
  coverageThreshold: {
      "global": {
          "branches": 80,
          "functions": 80,
          "lines": 80,
          "statements": 80
      }
    }
};