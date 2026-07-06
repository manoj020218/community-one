import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/tests/**', '!src/seeds/**'],
  coverageDirectory: 'coverage',
  testTimeout: 30000,
  globalSetup: '<rootDir>/src/tests/setup.ts',
  globalTeardown: '<rootDir>/src/tests/teardown.ts',
};

export default config;
