import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    // En dev, l'API tourne dans « wrangler dev » (port 8787).
    proxy: { '/api': 'http://localhost:8787' },
  },
});
