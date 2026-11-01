import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'https://web-code-game.pages.dev',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('crawled_codes_188.json')) return 'crawled-codes-offline-fallback';
          if (id.includes('games188.json')) return 'games-catalog-fallback';
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide-icons';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/qrcode')) {
            return 'qrcode-vendor';
          }
          if (id.includes('node_modules/fuse.js') || id.includes('node_modules/canvas-confetti')) {
            return 'utils-vendor';
          }
        },
      },
    },
  },
});
