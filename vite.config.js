import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { webAppServiceWorker } from './build-service-worker.mjs';
export default defineConfig({
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  base: './',
  plugins: [webAppServiceWorker()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(['index','calendar','discover','social','library'].map(name=>[name,resolve(process.cwd(),`${name}.html`)]))
    }
  }
});
