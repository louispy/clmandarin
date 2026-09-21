import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// navigator.share() with files needs a secure context, and only localhost is
// exempt — so testing the share sheet on a phone over http://<lan-ip> silently
// falls back to downloading the PNG. `npm run dev:https` serves the dev server
// over HTTPS with a self-signed certificate; accept the browser warning once on
// the phone and sharing works properly.
const httpsDev = process.env.VITE_HTTPS === '1'

export default defineConfig({
  base: '/clmandarin/',
  server: httpsDev ? { host: true } : undefined,
  plugins: [
    ...(httpsDev ? [basicSsl()] : []),
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
        'data/chengyu.json',
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
