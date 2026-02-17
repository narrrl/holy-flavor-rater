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
      chunkSizeWarningLimit: 2000,
    },
  }
})
