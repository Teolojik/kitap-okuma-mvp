import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Resolve pdfjs-dist path manually or rely on node_modules
// Using simple string replacement/lookup since 'path' is polyfilled usually only for node environment configs

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/react-pdf/node_modules/pdfjs-dist/cmaps',
          dest: 'cmaps',
        },
        {
          src: 'node_modules/react-pdf/node_modules/pdfjs-dist/standard_fonts',
          dest: 'standard_fonts',
        },
        {
          src: 'node_modules/react-pdf/node_modules/pdfjs-dist/wasm/*',
          dest: 'wasm',
        },
        {
          src: 'node_modules/react-pdf/node_modules/pdfjs-dist/image_decoders/*',
          dest: 'image_decoders',
        },
        {
          src: 'node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
          dest: '.',
        },
      ],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'KitapOkuma App',
        short_name: 'KitapOkuma',
        description: 'Türcçe e-kitap okuma uygulaması',
        theme_color: '#3b82f6',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
