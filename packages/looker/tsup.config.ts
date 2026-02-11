import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['iife'],
  globalName: 'SankeyLooker',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  minify: true,
  // Inline @opensankey/core — Looker needs a single file
  noExternal: ['@opensankey/core'],
});
