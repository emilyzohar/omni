import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  // Relative asset paths keep GitHub Pages working if the repository path changes.
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        discover: resolve(process.cwd(), 'discover.html'),
        social: resolve(process.cwd(), 'social.html')
      }
    }
  }
});
