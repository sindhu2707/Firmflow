import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    pool: 'forks',
    fileParallelism: false, // run test files serially; avoids multiple in-memory Mongo instances competing
    maxWorkers: 1,
    env: {
      NODE_ENV: 'test',
      MONGO_URI: 'mongodb://unused-in-tests',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
    },
  },
});