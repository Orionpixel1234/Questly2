/// <reference types="vitest" />

import { resolve } from 'path';
import analog from '@analogjs/platform';
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    root: __dirname,
    cacheDir: `../node_modules/.vite`,
    build: {
      outDir: '../dist/./analog/client',
      reportCompressedSize: true,
      target: ['es2020'],
    },
    server: {
      fs: {
        // '.' alone excludes the workspace-root node_modules (e.g. katex's
        // font files, served at dev time via a bare-specifier CSS @import),
        // which Vite would otherwise 403 in dev even though the production
        // build already bundles them fine.
        allow: ['.', resolve(__dirname, '../../node_modules')],
      },
    },
    plugins: [analog(), nxViteTsPaths(), tailwindcss()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['src/test-setup.ts'],
      include: ['**/*.spec.ts'],
      reporters: ['default'],
    },
  };
});
