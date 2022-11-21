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
  transform: {
    "\\.js$": "jest-handlebars"
  },
  transformIgnorePatterns:["node_modules/(?!(jest-)?react-native|react-(native|universal|navigation)-(.*)|@react-native-community/(.*)|@react-navigation/(.*)|bs-platform|@rootstrap/redux-tools)"]
};