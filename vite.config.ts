import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      workbox: {
        // 限制預先快取檔案大小為 2MB，防止一次下載幾十MB造成載入嚴重逾時
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        // 只預先快取首頁 index 的 js、css 資源及基本圖示，其餘一律運行時動態加載
        globPatterns: ['index.html', 'favicon.svg', 'icons.svg', 'assets/index-*.{js,css}'],
        // 排除大型 chunk 和 vendor
        globIgnores: ['**/vendor-*.js', '**/firebase-vendor-*.js', '**/EditorPage-*.js', '**/FileMasterPage-*.js', '**/pdfWorker-*.js', '**/*.wasm'],
        runtimeCaching: [
          {
            urlPattern: /.*\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 30 * 24 * 60 * 60 }
            }
          },
          {
            urlPattern: /.*pdf\.worker.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdf-worker-cache',
              expiration: { maxEntries: 2, maxAgeSeconds: 30 * 24 * 60 * 60 }
            }
          }
        ]
      },
      manifest: {
        name: 'SyncCore AI Office',
        short_name: 'SyncCore',
        description: 'Next Generation AI Office Suite',
        theme_color: '#f8fafc',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  define: {
    global: 'window',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase')) {
            return 'firebase-vendor';
          }
          if (id.includes('@google/generative-ai')) {
            return 'gemini-vendor';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    proxy: {
      '/api/chat': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
      }
    }
  }
})
// Trigger restart
