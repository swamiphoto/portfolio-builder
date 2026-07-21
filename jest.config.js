const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

// Base config — does NOT override transform yet, letting next/jest set up SWC with full jsConfig
const baseCustomConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^cheerio$': '<rootDir>/node_modules/cheerio/dist/commonjs/index.js',
  },
}

// next/jest returns an async function. We wrap it so we can intercept the final config
// and replace the SWC transform entry with our hybrid transformer — passing the same
// jestTransformerConfig (including jsConfig, baseUrl, etc.) that next/jest computed.
// This preserves path alias resolution (jsconfig baseUrl) while allowing babel-jest for
// ClientEngagementContext.js so jest.spyOn works on its named exports.
const getNextJestConfig = createJestConfig(baseCustomConfig)

module.exports = async () => {
  const config = await getNextJestConfig()
  // Find the SWC transform entry that next/jest added
  const swcTransformKey = '^.+\\.(js|jsx|ts|tsx|mjs)$'
  const swcEntry = config.transform[swcTransformKey]
  // swcEntry is [swcTransformerPath, jestTransformerConfig]
  const jestTransformerConfig = Array.isArray(swcEntry) ? swcEntry[1] : {}
  // Replace with our hybrid transformer, forwarding the same config
  config.transform[swcTransformKey] = [
    require.resolve('./jest-hybrid-transform.js'),
    jestTransformerConfig,
  ]
  return config
}
