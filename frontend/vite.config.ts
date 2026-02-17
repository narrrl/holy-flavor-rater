import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const allowedHosts = env.VITE_ALLOWED_HOSTS?.split(',') || [];

  return {
    plugins: [react()],
    server: {
      host: true, // Allow external access
      allowedHosts: allowedHosts,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@mui')) {
                return 'vendor-mui';
              }
              if (id.includes('react')) {
                return 'vendor-react';
              }
              if (id.includes('axios') || id.includes('i18next')) {
                return 'vendor-utils';
              }
              return 'vendor';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000, // Increase limit slightly as well
    },
  }
})
