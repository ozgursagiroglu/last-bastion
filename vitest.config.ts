import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/out/**', '**/.arbab/**', '**/.arbab-tmp/**'],
    // Several tests play whole levels and render them on a CPU canvas; shared CI runners are a few times slower.
    testTimeout: 90_000,
    hookTimeout: 120_000,
  },
});
