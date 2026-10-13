import { useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { useLoader } from '@react-three/fiber';
import { useKTX2 } from '@react-three/drei/webgpu';

import spiralGrassHeightUrl from '#assets/textures/spiral-grassHeight.ktx2';
import voronoiPerlinUrl from '#assets/textures/voronoi-perlin.ktx2';
import perlinCloudsUrl from '#assets/textures/perlin-clouds.webp';
import screensAtlasUrl from '#assets/textures/screens-atlas.ktx2';
import islandTextureUrl from '#assets/textures/islandTexture2k.ktx2';

// Channel-packed KTX2 textures baked by scripts/pack-textures.mjs. The files
// are baked vertically flipped (compressed textures cannot flipY at upload),
// so their UV space matches the PNGs under three's default flipY and all the
// shader/rect wiring is format-agnostic.

// useKTX2 caches by URL so every consumer shares one texture instance; the
// per-texture configure below runs once per mount and must stay consistent
// across consumers. `false` skips drei's transcoder path (a CDN by default):
// KTX2Loader then uses three's own Basis transcoder, emitted with the build.
const useConfiguredKtx2 = (url, configure) => {
  const texture = useKTX2(url, false);

  useMemo(() => configure(texture), [texture, configure]);

  return texture;
};

// Linear data, no repeat (clamp is the default)
const configureData = texture => {
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
};

// Linear data, repeating (every consumer scrolls or tiles its UVs)
const configureRepeatingData = texture => {
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
};

// sRGB-authored color
const configureColor = texture => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
};

// spiral-grassHeight. R: spiral sweep mask, G: grass height map.
const useSpiralGrassHeightTexture = () =>
  useConfiguredKtx2(spiralGrassHeightUrl, configureData);

// voronoi-perlin. R: voronoi cells, G: perlin noise.
const useVoronoiPerlinTexture = () =>
  useConfiguredKtx2(voronoiPerlinUrl, configureRepeatingData);

// perlin-clouds — standalone 512 lossless webp for the cloud shadows only:
// they magnify the noise far beyond the 128 packed copy, and both KTX2
// variants lost the A/B (UASTC bands on the thresholded gradients, raw R8
// arrives as a NEAREST-filtered DataTexture).
// useLoader caches by URL like useKTX2, so consumers share one instance.
// Not drei's useTexture: drei 11 reads state.gl, null under R3F 10 WebGPU
const usePerlinCloudsTexture = () => {
  const texture = useLoader(THREE.TextureLoader, perlinCloudsUrl);
  useMemo(() => configureRepeatingData(texture), [texture]);
  return texture;
};

// screens-atlas — images shown on screen (project portal screenshots,
// indicator Enter tile, X logo), flattened over black. No alpha channel: cutout
// consumers use the green channel as mask instead.
const useScreensAtlasTexture = () =>
  useConfiguredKtx2(screensAtlasUrl, configureColor);

// islandTexture2k — baseColor atlas for the island.glb materials (the GLB
// carries no texture, Islands.jsx assigns this map in code). Baked
// UNFLIPPED, unlike the files above: GLB UVs follow the glTF convention
// (flipY=false), which is also how compressed textures upload.
const useIslandTexture = () =>
  useConfiguredKtx2(islandTextureUrl, configureColor);

const ATLAS_SIZE = 1024;

// UV rect of a tile from its pixel box (v = 0 at the image bottom, matching
// the flip baked into the files)
const atlasRect = (left, top, width, height) => ({
  offset: new THREE.Vector2(
    left / ATLAS_SIZE,
    (ATLAS_SIZE - top - height) / ATLAS_SIZE
  ),
  size: new THREE.Vector2(width / ATLAS_SIZE, height / ATLAS_SIZE),
  aspect: width / height,
});

// Tile layout of the screens atlas (pixel boxes from scripts/pack-textures.mjs)
const SCREENS_ATLAS_RECTS = {
  halloweenChallenge: atlasRect(0, 0, 512, 342),
  hoHoNo: atlasRect(512, 0, 512, 342),
  doanTenConVat: atlasRect(0, 342, 512, 342),
  // Inset in its 256px tile at (512, 342): 4px off the right, where the
  // source art's "r" tail runs into the edge and showed as a cut-off line;
  // 2px off the left and top, which touch the neighbor screenshots (edge
  // samples, MSAA-extrapolated UVs and compression blocks reach them), and
  // the bottom to keep it centered.
  // Indicators.jsx sizes its plane to match
  enterTile: atlasRect(514, 344, 250, 252),
  xLogo: atlasRect(768, 342, 256, 256),
};

// Standalone view of one atlas tile through the texture matrix, for built-in
// materials that map a whole plane with it. The clone shares the transcoded
// mip data but gets its own GPU upload, so filters may differ from the atlas
// defaults.
const createAtlasTileTexture = (atlasTexture, rect) => {
  const texture = atlasTexture.clone();
  texture.offset.copy(rect.offset);
  texture.repeat.copy(rect.size);
  texture.needsUpdate = true;
  return texture;
};

export {
  useSpiralGrassHeightTexture,
  useVoronoiPerlinTexture,
  usePerlinCloudsTexture,
  useScreensAtlasTexture,
  useIslandTexture,
  SCREENS_ATLAS_RECTS,
  createAtlasTileTexture,
};
