module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["dist", "/node_modules"],
  testMatch: [
    "**/__tests__/*.ts"
  ]
};
