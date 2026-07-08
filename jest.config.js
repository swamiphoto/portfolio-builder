const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^cheerio$': '<rootDir>/node_modules/cheerio/dist/commonjs/index.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(cheerio|parse5|entities|dom-serializer|domelementtype|domhandler|domutils|undici)/)',
  ],
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
})
