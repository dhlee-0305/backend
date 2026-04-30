import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/test-*.ts'],
  testTimeout: 15000,
  forceExit: true,
  detectOpenHandles: true,
};

export default config;
