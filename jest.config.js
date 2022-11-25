module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["dist", "/node_modules"],
  testMatch: [
    "**/__tests__/*.ts"
  ],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@dist/(.*)$': '<rootDir>/dist/$1'
  },
  collectCoverage: true,
  collectCoverageFrom: [
        "src/**/*.ts"
    ],
    coveragePathIgnorePatterns: [
        "node_modules",
        "test-config",
        ".module.ts",
        "<rootDir>/src/generated/",
    ],
    coverageDirectory: "<rootDir>/coverage/",
    coverageThreshold: {
        "global": {
            "branches": 20,
            "functions": 30,
            "lines": 50,
            "statements": 50
        }
    }
};