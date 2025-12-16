import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false, // Allow Vite to use another port if 3000 is taken
    // Note: If 3000 is taken, Vite will try 3001, 3002, etc.
    // IMPORTANT: Make sure port 3000 is free to avoid conflicts with backend on 3001
    // Run: npm run free-ports (or .\free-ports.ps1) to free ports
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
        secure: false,
        // Don't proxy if we're on the same port as target
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            // Ignore ECONNABORTED errors (connection aborted)
            if (err.code !== 'ECONNABORTED') {
              console.log('proxy error', err);
            }
          });
        }
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          socket: ['socket.io-client']
        }
      }
    }
  }
})
