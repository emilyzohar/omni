import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Local development/builds can stay relative. GitHub Actions sets BASE_PATH
  // to /catch-all/ so assets resolve correctly at emilyzohar.github.io/catch-all/.
  base: process.env.BASE_PATH || './',

  // Keep the existing Expo-style public variable names.
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],

  // This is a two-page site. Without explicit inputs Vite only builds index.html.
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        discover: resolve(process.cwd(), 'discover.html')
      }
    }
  }
});
