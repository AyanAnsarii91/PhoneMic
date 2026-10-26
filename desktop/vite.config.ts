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
    port: 5174
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
