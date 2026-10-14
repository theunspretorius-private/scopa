import { defineConfig } from 'vitest/config';

const SERVER = process.env.SCOPA_SERVER ?? 'http://localhost:8787';

export default defineConfig({
  server: {
    host: true,
    proxy: {
      '/api': SERVER,
      '/ws': { target: SERVER.replace(/^http/, 'ws'), ws: true },
    },
  },
  worker: { format: 'es' },
  build: { target: 'es2020', sourcemap: true },
  test: { include: ['tests/**/*.test.ts'] },
});
