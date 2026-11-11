import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  // The Pages workflow sets this to /t-liga/; local development stays at /.
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 5173 },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('@radix-ui')) return 'radix';
            if (id.includes('msw') || id.includes('@mswjs')) return 'mock-worker';
            if (id.includes('zod') || id.includes('react-hook-form')) return 'forms';
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('@tanstack'))
              return 'react-vendor';
          }
        },
      },
    },
  },
});
