import { useMemo } from 'react';
import * as THREE from 'three';
import { useKTX2, useTexture } from '@react-three/drei';

import spiralGrassHeightUrl from '#assets/textures/spiral-grassHeight.ktx2';
import voronoiPerlinUrl from '#assets/textures/voronoi-perlin.ktx2';
import perlinCloudsUrl from '#assets/textures/perlin-clouds.webp';
import screensAtlasUrl from '#assets/textures/screens-atlas.ktx2';
import islandTextureUrl from '#assets/textures/islandTexture2k.ktx2';

// Channel-packed KTX2 textures baked by scripts/pack-textures.mjs. The files
// are baked vertically flipped (compressed textures cannot flipY at upload),
// so their UV space matches the PNGs under three's default flipY and all the
// shader/rect wiring is format-agnostic.

// Basis transcoder (public/basis/), served locally instead of drei's CDN
const TRANSCODER_PATH = `${import.meta.env.BASE_URL}basis/`;

// useKTX2 caches by URL so every consumer shares one texture instance; the
// per-texture configure below runs once per mount and must stay consistent
// across consumers.
const useConfiguredKtx2 = (url, configure) => {
  const texture = useKTX2(url, TRANSCODER_PATH);

  useMemo(() => configure(texture), [texture, configure]);

  return texture;
};

// spiral-grassHeight — linear data, no repeat (clamp is the default).
// R: spiral sweep mask, G: grass height map, B: 64x64 star sprite sitting at
// UV origin (sample with uv * 0.125).
const configureSpiralGrassHeight = texture => {
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
};

// voronoi-perlin — linear data, repeating (every consumer scrolls or tiles
// its UVs). R: voronoi cells, G: perlin noise.
const configureVoronoiPerlin = texture => {
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
};

// perlin-clouds — standalone 512 lossless webp for the cloud shadows only:
// they magnify the noise far beyond the 128 packed copy, and both KTX2
// variants lost the A/B (UASTC bands on the thresholded gradients, raw R8
// arrives as a NEAREST-filtered DataTexture).
const configurePerlinClouds = texture => {
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
};

// screens-atlas — sRGB-authored images shown on screen (project portal
// screenshots, interactive link, X logo), flattened over black. No alpha
// channel: cutout consumers use the green channel as mask instead.
const configureScreensAtlas = texture => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
};

// islandTexture2k — sRGB baseColor atlas for the island.glb materials (the
// GLB carries no texture, Islands.jsx assigns this map in code). Baked
// UNFLIPPED, unlike the files above: GLB UVs follow the glTF convention
// (flipY=false), which is also how compressed textures upload.
const configureIslandTexture = texture => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
};

const useSpiralGrassHeightTexture = () =>
  useConfiguredKtx2(spiralGrassHeightUrl, configureSpiralGrassHeight);

const useVoronoiPerlinTexture = () =>
  useConfiguredKtx2(voronoiPerlinUrl, configureVoronoiPerlin);

// useTexture caches by URL like useKTX2, so consumers share one instance
const usePerlinCloudsTexture = () => {
  const texture = useTexture(perlinCloudsUrl);
  useMemo(() => configurePerlinClouds(texture), [texture]);
  return texture;
};

const useScreensAtlasTexture = () =>
  useConfiguredKtx2(screensAtlasUrl, configureScreensAtlas);

const useIslandTexture = () =>
  useConfiguredKtx2(islandTextureUrl, configureIslandTexture);

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
  halloweenScene: atlasRect(0, 0, 512, 342),
  santaClousFighting: atlasRect(512, 0, 512, 342),
  doanTenCon: atlasRect(0, 342, 512, 342),
  interactiveLink: atlasRect(512, 342, 256, 256),
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
