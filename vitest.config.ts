import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    pool: 'forks', // safer with mongodb-memory-server
    poolOptions: {
      forks: {
        singleFork: true, // avoid multiple in-memory Mongo instances fighting for resources
      },
    },
  },
});