import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa';

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
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Melodiq',
        short_name: 'Melodiq',
        description: 'The ultimate local music game experience.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/games/melodiq',
        scope: '/',
        icons: [
          {
            src: 'pwa/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa/maskable_icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
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
          // Split network libraries (Melodiq)
          'lib-network': ['bittorrent-tracker', 'simple-peer'],
          // Split QR code libraries
          'lib-qrcode': ['html5-qrcode', 'qrcode', 'qrcode.react'],
          // Split storage
          'lib-storage': ['dexie', 'dexie-react-hooks', 'lz-string'],
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
