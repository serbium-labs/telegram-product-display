import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const API_PREFIX = '/api';
const DEFAULT_API_TARGET = 'http://localhost:3000';
const MEDIA_PREFIX = '/media';

const backendProxy = {
  target: DEFAULT_API_TARGET,
  changeOrigin: true,
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      [API_PREFIX]: backendProxy,
      [MEDIA_PREFIX]: backendProxy,
    },
  },
  test: {
    environment: 'jsdom',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./__tests__/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
