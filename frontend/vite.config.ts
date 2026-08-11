import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://rrg-indian-sectors-api.rrg-indian-sectors.workers.dev',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'https://rrg-indian-sectors-api.rrg-indian-sectors.workers.dev',
        changeOrigin: true,
      },
    },
  },
});
