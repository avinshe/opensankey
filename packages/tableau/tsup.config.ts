import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['iife'],
  globalName: 'OpenSankeyTableau',
  minify: true,
  sourcemap: true,
  noExternal: ['@opensankey/core'],
  platform: 'browser',
});
