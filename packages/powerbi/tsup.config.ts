import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['iife'],
  globalName: 'OpenSankeyPowerBI',
  minify: true,
  sourcemap: true,
  noExternal: ['@opensankey/core'],
  platform: 'browser',
});
