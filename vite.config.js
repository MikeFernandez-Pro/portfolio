import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), glsl()],
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.ktx2'],
  root: 'src/',
  publicDir: '../public/',
  base: './',
  server: {
    host: true,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Cache-friendly vendor chunk: three is pinned and rarely changes
    // between deploys, so it stays cached while the app chunk churns
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'three',
              test: /node_modules[\\/]three[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
