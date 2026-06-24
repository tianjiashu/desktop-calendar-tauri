import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.*',
        'src/vite-env.d.ts',
        'src/test-setup.ts',
        'src/types/diagnostic.types.ts',
        'src/types/sync.types.ts',
        'src/types/index.ts',
      ],
      reporter: ['text', 'text-summary'],
    },
  },
});
