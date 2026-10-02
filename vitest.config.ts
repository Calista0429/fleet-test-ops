import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@fleet/contracts': resolve('packages/contracts/src/index.ts') } },
  test: {
    include: [
      'packages/**/*.test.ts',
      'database/test/**/*.test.ts',
      'apps/api/test/**/*.test.ts',
      'apps/web/src/**/*.test.{ts,tsx}',
    ],
    setupFiles: ['tests/support/environment.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
    restoreMocks: true,
  },
});
