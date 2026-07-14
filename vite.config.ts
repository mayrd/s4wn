import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'assets',
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
    // Externalize optional dev-only packages that may not be installed
    rolldownOptions: {
      external: ['@babylonjs/inspector'],
    },
  },
});
