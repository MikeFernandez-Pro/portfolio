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

// sRGB atlas of on-screen textures (portal screens + interactive link).
// Power-of-two canvas so mipmaps can be generated; tiles keep native size,
// the leftover bottom band is transparent black.
const ATLAS = {
  output: 'screens-atlas.png',
  width: 1024,
  height: 1024,
  tiles: [
    { file: 'halloween-scene.png', left: 0, top: 0 },
    { file: 'ho-ho-no.png', left: 512, top: 0 },
    { file: 'doan-ten-con-vat.png', left: 0, top: 342 },
    { file: 'interactive-link.webp', left: 512, top: 342 },
    { file: 'x2.png', left: 768, top: 342 },
  ],
};

// Grabs the red channel's raw bytes without any color-space conversion,
// so the packed data stays exactly as authored (sampled as linear at runtime).
async function extractRawChannel(file, resize) {
  let image = sharp(path.join(TEXTURES_DIR, file));
  if (resize) image = image.resize(resize, resize);
  return image
    .extractChannel('red')
    .raw()
    .toBuffer({ resolveWithObject: true });
}

for (const [output, [rSource, gSource]] of PACKS) {
  const [r, g] = await Promise.all([
    extractRawChannel(rSource),
    extractRawChannel(gSource),
  ]);
  const { width, height } = r.info;

  if (g.info.width !== width || g.info.height !== height) {
    throw new Error(
      `Size mismatch for ${output}: ${rSource} is ${width}x${height}, ${gSource} is ${g.info.width}x${g.info.height}`
    );
  }

  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    pixels[i * 3] = r.data[i];
    pixels[i * 3 + 1] = g.data[i];
  }

  const outputPath = path.join(TEXTURES_DIR, output);
  await sharp(pixels, { raw: { width, height, channels: 3 } })
    .png({ compressionLevel: 9, palette: false })
    .toFile(outputPath);

  console.log(
    `${outputPath} (${width}x${height}) — R: ${rSource}, G: ${gSource}`
  );
}

// Grass placement mask: the height map downscaled to a small grayscale PNG
// that Grass.jsx reads back on the CPU (the KTX2 cannot be read) to spawn
// blades only where there is grass. Row 0 is the image top, which is v = 1
// under three's default flipY / the flipped KTX2 bake below - the mapping
// grassPlacement.js relies on.
const PLACEMENT = {
  source: 'grass-height-map.webp',
  output: 'grass-placement.png',
  size: 128,
};
{
  const outputPath = path.join(TEXTURES_DIR, PLACEMENT.output);
  await sharp(path.join(TEXTURES_DIR, PLACEMENT.source))
    .extractChannel('red')
    .resize(PLACEMENT.size, PLACEMENT.size, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9, palette: false })
    .toFile(outputPath);
  console.log(
    `${outputPath} (${PLACEMENT.size}x${PLACEMENT.size}) — grass placement mask from ${PLACEMENT.source}`
  );
}

// Standalone 512 perlin (perlin-clouds.png) for the cloud shadows, which
// magnify the noise far beyond any other consumer — the 128 perlin.png the
// pack above uses pixelates there. Lossless webp, not KTX2: block
// compression bands on smooth gradients once thresholded, and a plain
// texture uploads with three's default flipY like every other PNG/webp.
const CLOUD_PERLIN = {
  source: 'perlin-clouds.png',
  output: 'perlin-clouds.webp',
};
{
  const outputPath = path.join(TEXTURES_DIR, CLOUD_PERLIN.output);
  await sharp(path.join(TEXTURES_DIR, CLOUD_PERLIN.source))
    .webp({ lossless: true })
    .toFile(outputPath);
  console.log(
    `${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(0)} kB) — lossless cloud-shadow perlin from ${CLOUD_PERLIN.source}`
  );
}

const composites = await Promise.all(
  ATLAS.tiles.map(async ({ file, left, top }) => ({
    input: await sharp(path.join(TEXTURES_DIR, file))
      .ensureAlpha()
      .png()
      .toBuffer(),
    left,
    top,
  }))
);

const atlasPath = path.join(TEXTURES_DIR, ATLAS.output);
// Composite first, then flatten alpha over black so the output is plain RGB
// (the link's white-on-transparent text becomes white-on-black).
const composed = await sharp({
  create: {
    width: ATLAS.width,
    height: ATLAS.height,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
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
  const { width, height } = await sharp(
    path.join(TEXTURES_DIR, file)
  ).metadata();
  // UV rect with three.js flipY (v=0 at image bottom)
  const u = left / ATLAS.width;
  const v = (ATLAS.height - top - height) / ATLAS.height;
  console.log(
    `  ${file}: offset (${u}, ${v}) size (${width / ATLAS.width}, ${height / ATLAS.height})`
  );
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
    args: [
      '--format',
      'R8G8B8_UNORM',
      '--assign-tf',
      'linear',
      '--encode',
      'uastc',
      '--uastc-quality',
      '3',
      '--zstd',
      '19',
    ],
  },
  {
    source: 'voronoi-perlin.png',
    args: [
      '--format',
      'R8G8B8_UNORM',
      '--assign-tf',
      'linear',
      '--encode',
      'uastc',
      '--uastc-quality',
      '3',
      '--zstd',
      '19',
    ],
  },
  // UASTC also for the screens: ETC1S softened the portal screenshots way
  // too much. RDO shaves the zstd size a bit while staying near-lossless.
  {
    source: 'screens-atlas.png',
    args: [
      '--format',
      'R8G8B8_SRGB',
      '--assign-tf',
      'srgb',
      '--encode',
      'uastc',
      '--uastc-quality',
      '3',
      '--uastc-rdo',
      '--uastc-rdo-l',
      '1.0',
      '--zstd',
      '19',
    ],
  },
];

const kb = v => `${(v / 1024).toFixed(0)} kB`;

// Writes `prepare(sharp(sourcePath))` to a temp PNG, encodes it to ktx2Path
// with mipmaps, then deletes the temp file
const encodeKtx2 = async ({ sourcePath, ktx2Path, prepare, args }) => {
  const tempPath = ktx2Path.replace(/\.ktx2$/, '.tmp.png');
  await prepare(sharp(sourcePath))
    .png({ compressionLevel: 1 })
    .toFile(tempPath);

  const result = spawnSync(
    'ktx',
    ['create', ...args, '--generate-mipmap', tempPath, ktx2Path],
    { encoding: 'utf8' }
  );
  fs.unlinkSync(tempPath);

  if (result.status !== 0) {
    throw new Error(`ktx create failed for ${sourcePath}:\n${result.stderr}`);
  }

  console.log(
    `${ktx2Path} (${kb(fs.statSync(ktx2Path).size)}, from ${kb(fs.statSync(sourcePath).size)} ${path.basename(sourcePath)})`
  );
};

if (spawnSync('ktx', ['--version']).error) {
  console.warn(
    '\nktx CLI not found - skipping KTX2 encoding (the app loads the .ktx2 files, which are now stale)'
  );
} else {
  for (const { source, args } of KTX_ENCODES) {
    const sourcePath = path.join(TEXTURES_DIR, source);
    await encodeKtx2({
      sourcePath,
      ktx2Path: sourcePath.replace(/\.png$/, '.ktx2'),
      prepare: image => image.flip(),
      args,
    });
  }

  // Island baseColor atlas, applied in code to the island.glb materials
  // (the GLB itself carries no texture). Unlike the entries above, NOT
  // flipped: GLB UVs follow the glTF convention (flipY=false), which is
  // also how KTX2 uploads — the extracted PNG is already in that
  // orientation. RGBA: several island materials are alphaMode MASK and
  // cut out through the atlas alpha.
  await encodeKtx2({
    sourcePath: 'extracted-textures/islandTexture4k.png',
    ktx2Path: path.join(TEXTURES_DIR, 'islandTexture2k.ktx2'),
    prepare: image => image.resize(2048, 2048),
    // No RDO: it banded the atlas's smooth gradients (RDO trades block
    // quality for zstd size; dropping it costs ~0.4 MB on disk, GPU
    // memory is unchanged)
    args: [
      '--format',
      'R8G8B8A8_SRGB',
      '--assign-tf',
      'srgb',
      '--encode',
      'uastc',
      '--uastc-quality',
      '4',
      '--zstd',
      '19',
    ],
  });
}
