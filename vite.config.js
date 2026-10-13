import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';

// Bare `three` imports resolve to `three/webgpu`: the same shared core plus
// the WebGPU renderer, without the classic WebGLRenderer and its GLSL
// chunks. Everything — our code, drei, three-mesh-bvh, the addons — would
// otherwise drag that renderer into the startup download through the shared
// three.module.js (R3F's lazy WebGL chunk imports its namespace whole, so
// none of it tree-shakes).
// - R3F's lazy WebGL support chunk keeps the real `three`: it is only
//   fetched if R3F ever builds a WebGLRenderer, which this app never does
// - gainmap-js and the Sky addon, pulled in by drei's barrel but unused
//   here, need two classic-only exports: they get a shim that throws if
//   those are ever actually used
const R3F_WEBGL_CHUNK = /@react-three[\\/]fiber[\\/]dist[\\/]chunks[\\/]webgl/;
const CLASSIC_EXPORT_USERS =
  /@monogrid[\\/]gainmap-js|three[\\/]examples[\\/]jsm[\\/]objects[\\/]Sky\.js/;
const CLASSIC_SHIM_ID = '\0three-classic-shim';
const CLASSIC_SHIM = `
export * from 'three/webgpu';
const unavailable = name => {
  throw new Error(name + ' is not bundled: WebGPU-only build (vite.config.js)');
};
export class WebGLRenderer {
  constructor() { unavailable('WebGLRenderer'); }
}
export const UniformsUtils = {
  clone() { unavailable('UniformsUtils'); },
  merge() { unavailable('UniformsUtils'); },
};
`;

const threeWebGPUOnly = () => ({
  name: 'three-webgpu-only',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (source !== 'three' || !importer) return null;
    if (R3F_WEBGL_CHUNK.test(importer)) return null;
    if (CLASSIC_EXPORT_USERS.test(importer)) return CLASSIC_SHIM_ID;
    return this.resolve('three/webgpu', importer, {
      ...options,
      skipSelf: true,
    });
  },
  load(id) {
    return id === CLASSIC_SHIM_ID ? CLASSIC_SHIM : null;
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // `pnpm dev:https` serves over a self-signed certificate: WebGPU needs a
  // secure context, which plain http only gets on localhost (phone testing).
  plugins: [
    threeWebGPUOnly(),
    react(),
    ...(mode === 'https' ? [basicSsl()] : []),
  ],
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.ktx2'],
  root: 'src/',
  publicDir: '../public/',
  base: './',
  server: {
    host: true,
    // Phone testing through `cloudflared tunnel` (real certificate)
    allowedHosts: ['.trycloudflare.com'],
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Cache-friendly vendor chunk: three is pinned and rarely changes
    // between deploys, so it stays cached while the app chunk churns.
    // Left out, or grouping them here would make them part of the startup
    // download: build/three.module.js (past the shared core it is the classic
    // WebGLRenderer, which R3F only lazy-loads for its WebGL path) and the
    // Inspector addon (debug only; drei lazy-loads it for its <Inspector>)
    // with the OrbitControls its render target viewer pulls in
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'three',
              test: /node_modules[\\/]three[\\/](?!build[\\/]three\.module\.js|examples[\\/]jsm[\\/](?:inspector|controls)[\\/])/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
}));
