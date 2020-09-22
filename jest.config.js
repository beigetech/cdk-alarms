module.exports = {
	roots: ['<rootDir>/test', '<rootDir>/lib', '<rootDir>/functions'],
	collectCoverageFrom: ['lib/*.js', '!lib/index.js', 'functions/**/*.js'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  coverageReporters: ['text-summary'],	
  coverageThreshold: {
    global: {
	    branches: 90,
	    functions: 80,
	    lines: 80,
	    statetments: 90
    }
  }
	
};
