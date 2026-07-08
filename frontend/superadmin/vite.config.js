import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  base: '/superadmin/',
  css: {
    postcss: path.resolve(__dirname, 'postcss.config.cjs'),
  },
  build: {
    outDir: path.resolve(__dirname, '../../backend/public/superadmin'),
    emptyOutDir: true,
  },
  server: {
    port: 5175,
    proxy: {
      '/api': 'http://127.0.0.1:8080',
      '/uploads': 'http://127.0.0.1:8080',
    },
  },
});
