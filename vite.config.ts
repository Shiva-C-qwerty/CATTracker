/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
// NOTE: If deploying to a GitHub Pages *project* site (served from /<repo>/),
// set `base: '/<repo>/'` here and pass a matching `basename` to the Router.
// Vercel and user/org GitHub Pages serve from '/', so leave base as default.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // react-katex is CJS; pre-bundle it (and katex) so interop is consistent.
  optimizeDeps: {
    include: ['react-katex', 'katex'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
