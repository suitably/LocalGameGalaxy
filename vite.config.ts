import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for specific globals and modules
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    {
      name: 'sourcemap-404',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.map')) {
            // If the map file isn't found by previous middlewares, return 404 explicitly
            // to prevent falling back to index.html (SPA fallback)
            res.statusCode = 404;
            res.end();
          } else {
            next();
          }
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React and React DOM into their own chunk
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Split Material-UI into its own chunk
          'mui-vendor': [
            '@mui/material',
            '@mui/icons-material',
            '@mui/lab',
            '@emotion/react',
            '@emotion/styled'
          ],
          // Split other heavy libraries
          'lib-vendor': [
            'dexie',
            'simple-peer',
            'bittorrent-tracker',
            'html5-qrcode',
            'qrcode',
            'qrcode.react'
          ],
        },
      },
    },
    // Increase chunk size warning limit (we're aware of large chunks)
    chunkSizeWarningLimit: 600,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Use esbuild for minification (default, faster than terser)
    minify: 'esbuild',
  },
})
