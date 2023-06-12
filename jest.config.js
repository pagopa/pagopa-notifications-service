module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/dist","/node_modules"],
  testMatch: [
    "**/__tests__/*.ts"
  ],
  setupFiles: ["<rootDir>/jest.setup.js"],
  rootDir: ".",
  moduleNameMapper: {
    '^[./a-zA-Z0-9$_-]+\\/success/schema.js$':'<rootDir>/dist/src/generated/templates/success/schema.js',
    '^[./a-zA-Z0-9$_-]+\\/ko/schema.js$':'<rootDir>/dist/src/generated/templates/ko/schema.js',
  },
  collectCoverage: false,
  collectCoverageFrom: [
      "src/**/*.ts"
  ],
  testResultsProcessor: "jest-sonar-reporter",
  coveragePathIgnorePatterns: [
      "node_modules",
      "test-config",
      ".module.ts",
      "<rootDir>/src/generated/",
      "<rootDir>/src/util/appInsights.ts",
      "<rootDir>/src/__mocks__/*.ts"
  ],
  coverageDirectory: "<rootDir>/coverage/",
  /*coverageThreshold: {
      "global": {
          "branches": 80,
          "functions": 80,
          "lines": 80,
          "statements": 80
      }
    }*/
};