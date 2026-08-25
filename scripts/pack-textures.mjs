/* global console, Buffer */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const TEXTURES_DIR = 'src/assets/textures';

// [output name, [source for R channel, source for G channel]]
const PACKS = [
  ['spiral-grassHeight.png', ['spiralTexture.png', 'grass-height-map.webp']],
  ['voronoi-perlin.png', ['voronoi.webp', 'perlin.png']],
];

// Star sprite packed into the blue channel of spiral-grassHeight.png.
// Placed at the bottom-left of the image so that with three.js's default
// flipY it sits at UV origin: sample it with uv * (STAR_SIZE / 512).
const STAR = { file: 'star.png', size: 64, packInto: 'spiral-grassHeight.png' };

// sRGB atlas of on-screen textures (portal screens + interactive link).
// Power-of-two canvas so mipmaps can be generated; tiles keep native size,
// the leftover bottom band is transparent black.
const ATLAS = {
  output: 'screens-atlas.png',
  width: 1024,
  height: 1024,
  tiles: [
    { file: 'halloween-scene.png', left: 0, top: 0 },
    { file: 'santa-clous-fighting.png', left: 512, top: 0 },
    { file: 'doan-ten-con-.png', left: 0, top: 342 },
    { file: 'intertactive-link.webp', left: 512, top: 342 },
    { file: 'x2.png', left: 768, top: 342 },
  ],
};

// Grabs the red channel's raw bytes without any color-space conversion,
// so the packed data stays exactly as authored (sampled as linear at runtime).
async function extractRawChannel(file, resize) {
  let image = sharp(path.join(TEXTURES_DIR, file));
  if (resize) image = image.resize(resize, resize);
  return image.extractChannel('red').raw().toBuffer({ resolveWithObject: true });
}

for (const [output, [rSource, gSource]] of PACKS) {
  const [r, g] = await Promise.all([extractRawChannel(rSource), extractRawChannel(gSource)]);
  const { width, height } = r.info;

  if (g.info.width !== width || g.info.height !== height) {
    throw new Error(`Size mismatch for ${output}: ${rSource} is ${width}x${height}, ${gSource} is ${g.info.width}x${g.info.height}`);
  }

  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 3] = r.data[i];
    pixels[i * 3 + 1] = g.data[i];
  }

  if (output === STAR.packInto) {
    const star = await extractRawChannel(STAR.file, STAR.size);
    for (let y = 0; y < STAR.size; y++) {
      for (let x = 0; x < STAR.size; x++) {
        const target = (height - STAR.size + y) * width + x;
        pixels[target * 3 + 2] = star.data[y * STAR.size + x];
      }
    }
    console.log(`  B: ${STAR.file} (${STAR.size}x${STAR.size} at bottom-left, UV scale ${STAR.size / width})`);
  }

  const outputPath = path.join(TEXTURES_DIR, output);
  await sharp(pixels, { raw: { width, height, channels: 3 } })
    .png({ compressionLevel: 9, palette: false })
    .toFile(outputPath);

  console.log(`${outputPath} (${width}x${height}) — R: ${rSource}, G: ${gSource}`);
}

const composites = await Promise.all(
  ATLAS.tiles.map(async ({ file, left, top }) => ({
    input: await sharp(path.join(TEXTURES_DIR, file)).ensureAlpha().png().toBuffer(),
    left,
    top,
  })),
);

const atlasPath = path.join(TEXTURES_DIR, ATLAS.output);
// Composite first, then flatten alpha over black so the output is plain RGB
// (the link's white-on-transparent text becomes white-on-black).
const composed = await sharp({
  create: { width: ATLAS.width, height: ATLAS.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(composites)
  .png()
  .toBuffer();
await sharp(composed)
  .flatten({ background: { r: 0, g: 0, b: 0 } })
  .png({ compressionLevel: 9, palette: false })
  .toFile(atlasPath);

console.log(`${atlasPath} (${ATLAS.width}x${ATLAS.height}, sRGB):`);
for (const { file, left, top } of ATLAS.tiles) {
  const { width, height } = await sharp(path.join(TEXTURES_DIR, file)).metadata();
  // UV rect with three.js flipY (v=0 at image bottom)
  const u = left / ATLAS.width;
  const v = (ATLAS.height - top - height) / ATLAS.height;
  console.log(`  ${file}: offset (${u}, ${v}) size (${width / ATLAS.width}, ${height / ATLAS.height})`);
}

// --- KTX2 encoding (requires the KTX-Software `ktx` CLI v5+) ---
// Compressed textures cannot flipY at upload, so each KTX2 is baked from a
// vertically flipped copy of its PNG: the resulting UV space is identical to
// the PNGs uploaded with three's default flipY, and none of the shader/rect
// wiring changes. UASTC for the channel-packed linear data (independent
// channels, ETC1S would bleed across them), Basis-LZ/ETC1S for the sRGB
// screens (photographic content, huge size win).
const KTX_ENCODES = [
  {
    source: 'spiral-grassHeight.png',
    args: ['--format', 'R8G8B8_UNORM', '--assign-tf', 'linear',
      '--encode', 'uastc', '--uastc-quality', '3', '--zstd', '19'],
  },
  {
    source: 'voronoi-perlin.png',
    args: ['--format', 'R8G8B8_UNORM', '--assign-tf', 'linear',
      '--encode', 'uastc', '--uastc-quality', '3', '--zstd', '19'],
  },
  // UASTC also for the screens: ETC1S softened the portal screenshots way
  // too much. RDO shaves the zstd size a bit while staying near-lossless.
  {
    source: 'screens-atlas.png',
    args: ['--format', 'R8G8B8_SRGB', '--assign-tf', 'srgb',
      '--encode', 'uastc', '--uastc-quality', '3',
      '--uastc-rdo', '--uastc-rdo-l', '1.0', '--zstd', '19'],
  },
];

if (spawnSync('ktx', ['--version']).error) {
  console.warn('\nktx CLI not found - skipping KTX2 encoding (PNGs still valid)');
} else {
  for (const { source, args } of KTX_ENCODES) {
    const sourcePath = path.join(TEXTURES_DIR, source);
    const flippedPath = sourcePath.replace(/\.png$/, '.flipped.tmp.png');
    const ktx2Path = sourcePath.replace(/\.png$/, '.ktx2');

    await sharp(sourcePath).flip().png({ compressionLevel: 1 }).toFile(flippedPath);

    const result = spawnSync(
      'ktx',
      ['create', ...args, '--generate-mipmap', flippedPath, ktx2Path],
      { encoding: 'utf8' }
    );
    fs.unlinkSync(flippedPath);

    if (result.status !== 0) {
      throw new Error(`ktx create failed for ${source}:\n${result.stderr}`);
    }

    const kb = v => `${(v / 1024).toFixed(0)} kB`;
    console.log(
      `${ktx2Path} (${kb(fs.statSync(ktx2Path).size)}, from ${kb(fs.statSync(sourcePath).size)} png)`
    );
  }
}
