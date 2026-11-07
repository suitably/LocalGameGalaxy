import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';
import { cpSync, existsSync } from 'node:fs';

/**
 * Serves Excalidraw's fonts from our own host instead of esm.sh (#645): copies them into
 * `public/excalidraw/fonts` (gitignored) when the config loads, before Vite lists `public/`; `ExcalidrawLazy` points
 * `window.EXCALIDRAW_ASSET_PATH` there.
 */
const excalidrawFonts = () => ({
  name: 'excalidraw-fonts',
  config() {
    const from = 'node_modules/@excalidraw/excalidraw/dist/prod/fonts';
    const to = 'public/excalidraw/fonts';
    if (existsSync(from) && !existsSync(to)) cpSync(from, to, { recursive: true });
  },
});

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api/steam': {
        target: 'https://api.steampowered.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/steam/, ''),
      },
    },
  },
  plugins: [
    excalidrawFonts(),
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
      injectRegister: 'auto',
      includeAssets: ['nexumia-icon.svg', 'pwa/*.png'],
      manifest: {
        name: 'Nexumia',
        short_name: 'Nexumia',
        description: 'Local multiplayer party game collection.',
        theme_color: '#17141C',
        background_color: '#17141C',
        display: 'standalone',
        display_override: ['standalone', 'window-controls-overlay', 'minimal-ui'],
        start_url: '/',
        scope: '/',
        id: '/',
        orientation: 'any',
        categories: ['games', 'entertainment'],
        icons: [
          {
            src: '/pwa/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa/maskable_icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/pwa/icon_full.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
        // Excalidraw's fonts (13 MB, mostly CJK) are cached on first use, not precached
        globIgnores: ['**/excalidraw/fonts/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/excalidraw/fonts/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'excalidraw-fonts',
              expiration: { maxEntries: 300 },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        importScripts: ['/sw-push.js'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
      },
      devOptions: {
        enabled: true,
      },
    }),
    {
      name: 'sourcemap-fallback',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.split('?')[0].endsWith('.map')) {
            // Return a valid empty sourcemap JSON to prevent browser devtools 404 warnings
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ version: 3, file: '', sources: [], mappings: '' }));
          } else {
            next();
          }
        });
      },
    },
  ],
  resolve: {
    dedupe: ['react', 'react-dom', '@emotion/react', '@emotion/styled', 'react-router-dom'],
  },
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
            '@emotion/styled',
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
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
