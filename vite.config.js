import { defineConfig } from 'vite';

export default defineConfig({
  // Keep your existing Expo-style variable names instead of renaming them to VITE_*.
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  base: './'
});
