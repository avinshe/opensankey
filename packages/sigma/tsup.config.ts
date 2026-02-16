import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['iife'],
  globalName: 'OpenSankeySigma',
  minify: true,
  sourcemap: true,
  noExternal: ['@opensankey/core', '@sigmacomputing/plugin'],
  platform: 'browser',
});
