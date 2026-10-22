import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Libraries and the translation tables change less often than the app: separate files
        // download in parallel and stay cached across releases.
        manualChunks(id) {
          if (id.includes('/src/lib/locales/')) return 'locales';
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react';
          if (id.includes('node_modules/framer-motion/')) return 'motion';
          if (/node_modules\/(@tanstack|zod|react-hook-form|@hookform)\//.test(id)) return 'data';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.tsx'],
  },
});
