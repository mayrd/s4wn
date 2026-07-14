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
    rolldownOptions: {
      input: {
        main: './index.html',
      },
      external: ['@babylonjs/inspector'],
    },
  },
});
