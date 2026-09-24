import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

// GitHub Pages publica em https://<usuario>.github.io/<repositorio>/
// O workflow de deploy define BASE_PATH=/<repositorio>/ automaticamente.
const base = process.env.BASE_PATH || '/';
const compartilhar = JSON.parse(readFileSync(new URL('./src/pwa/manifest.compartilhar.json', import.meta.url), 'utf8'));
delete compartilhar._comentario;

export default defineConfig({
  base,
  plugins: [
    svelte(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        // só o subconjunto latino das fontes vai para o cache offline (português)
        globIgnores: ['**/*vietnamese*', '**/*latin-ext*', '**/*cyrillic*', '**/*greek*'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        id: './',
        name: 'Pratoria — caderno de receitas',
        short_name: 'Pratoria',
        description: 'Seu caderno de receitas: importe, organize, cozinhe página por página e compartilhe.',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F3EBDD',
        theme_color: '#F3EBDD',
        categories: ['food', 'lifestyle'],
        icons: [
          { src: 'icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        ...compartilhar,
      },
    }),
  ],
});
