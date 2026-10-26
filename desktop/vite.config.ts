import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@phonemic/shared': path.resolve(__dirname, '../shared/src')
    }
  },
  base: './',
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://127.0.0.1:8990',
        changeOrigin: true,
        secure: false
      },
      '/status': {
        target: 'https://127.0.0.1:8990',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
