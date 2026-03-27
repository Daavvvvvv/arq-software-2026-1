module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/'],
  moduleNameMapper: {
    '@concert/domain/(.*)': '<rootDir>/libs/domain/src/$1',
    '@concert/domain': '<rootDir>/libs/domain/src/index',
    '@concert/events/(.*)': '<rootDir>/libs/events/src/$1',
    '@concert/events': '<rootDir>/libs/events/src/index',
    '@concert/messaging/(.*)': '<rootDir>/libs/messaging/src/$1',
    '@concert/messaging': '<rootDir>/libs/messaging/src/index',
    '@concert/auth/(.*)': '<rootDir>/libs/auth/src/$1',
    '@concert/auth': '<rootDir>/libs/auth/src/index',
    '@concert/database/(.*)': '<rootDir>/libs/database/src/$1',
    '@concert/database': '<rootDir>/libs/database/src/index',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
};
