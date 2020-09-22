module.exports = {
	roots: ['<rootDir>/test', '<rootDir>/lib', '<rootDir>/resources'],
	collectCoverageFrom: ['lib/*.js', '!lib/index.js', 'resources/**/*.js'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  coverageReporters: ['text-summary'],	
  coverageThreshold: {
    global: {
	    branches: 95,
	    functions: 80,
	    lines: 80,
	    statetments: 90
    }
  }
	
};
