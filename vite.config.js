import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ command }) => ({
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  base: command === 'build' ? '/catch-all/' : '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        discover: resolve(process.cwd(), 'discover.html')
      }
    }
  }
}));
