import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the built site works from any static host / subpath.
  base: './',
  // Pin an (empty) inline PostCSS config so Vite does NOT walk up the tree
  // and pick up the parent Rails monolith's postcss.config.js.
  css: {
    postcss: {},
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
