module.exports = {
	roots: ['<rootDir>/test', '<rootDir>/lib'],
	collectCoverageFrom: ['lib/*.js', '!lib/index.js'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  coverageReporters: ['text-summary'],	
  coverageThreshold: {
    global: {
	    branches: 100,
	    functions: 100,
	    lines: 100,
	    statetments: 100
    }
  }
	
};
