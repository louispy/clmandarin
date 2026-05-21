import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/clmandarin/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icon.svg',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
        'data/hsk-all.json',
      ],
      manifest: {
        name: 'CLMandarin',
        short_name: 'CLMandarin',
        description: 'Offline HSK 1-6 Mandarin flashcard app',
        theme_color: '#C41E3A',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,svg,png}'],
      },
    }),
  ],
})
