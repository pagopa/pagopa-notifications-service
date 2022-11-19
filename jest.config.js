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
};