/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this project at https://<user>.github.io/Sambar-Settlement/
// Override with BASE_PATH env var if the repo is renamed or a custom domain is used.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/Sambar-Settlement/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
