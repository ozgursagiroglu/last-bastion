import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    // exodeui bundles its renderer, three.js and the Rapier WASM; one large chunk is expected.
    chunkSizeWarningLimit: 6000,
  },
});
