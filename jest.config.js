module.exports = {
	roots: ['<rootDir>/test', '<rootDir>/lib', '<rootDir>/functions'],
	collectCoverageFrom: ['lib/*.js', '!lib/index.js', 'functions/**/*.js'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  coverageReporters: ['text-summary', 'lcov'],	
  coverageThreshold: {
    global: {
	    lines: 80
    }
  }
	
};
