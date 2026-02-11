import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs', 'iife'],
  globalName: 'OpenSankey',
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
});
