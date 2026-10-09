// One-off: converts src/assets/fonts/metamorphous.woff into the typeface JSON
// that three's Font (FloatingSkills) expects. Same conversion as three's
// TTFLoader, which can't be used at runtime here (it imports opentype.js from
// a CDN URL). Printable Latin-1 only, to keep the JSON small.
//
// opentype.js is not a project dependency; install it anywhere and point to it:
//   OPENTYPE=/tmp/ot/node_modules/opentype.js/dist/opentype.module.js \
//     node scripts/make-typeface.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const opentypePath = process.env.OPENTYPE;
if (!opentypePath) throw new Error('Set OPENTYPE to opentype.module.js');
const { default: opentype } = await import(pathToFileURL(opentypePath).href);

const SRC = 'src/assets/fonts/metamorphous.woff';
const OUT = 'src/assets/fonts/metamorphous.typeface.json';

const buffer = readFileSync(SRC);
const font = opentype.parse(
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
);

const round = Math.round;
const scale = 100000 / ((font.unitsPerEm || 2048) * 72);
const glyphs = {};
const glyphIndexMap = font.encoding.cmap.glyphIndexMap;

for (const unicode of Object.keys(glyphIndexMap)) {
  const code = Number(unicode);
  if (code < 32 || code > 255 || (code > 126 && code < 160)) continue;
  const glyph = font.glyphs.get(glyphIndexMap[unicode]);
  const token = {
    ha: round(glyph.advanceWidth * scale),
    x_min: round((glyph.xMin ?? 0) * scale),
    x_max: round((glyph.xMax ?? 0) * scale),
    o: '',
  };
  for (const command of glyph.path.commands) {
    const type =
      command.type.toLowerCase() === 'c' ? 'b' : command.type.toLowerCase();
    token.o += type + ' ';
    if (command.x !== undefined)
      token.o +=
        round(command.x * scale) + ' ' + round(command.y * scale) + ' ';
    if (command.x1 !== undefined)
      token.o +=
        round(command.x1 * scale) + ' ' + round(command.y1 * scale) + ' ';
    if (command.x2 !== undefined)
      token.o +=
        round(command.x2 * scale) + ' ' + round(command.y2 * scale) + ' ';
  }
  glyphs[String.fromCodePoint(code)] = token;
}

const json = {
  glyphs,
  familyName: font.getEnglishName('fullName'),
  ascender: round(font.ascender * scale),
  descender: round(font.descender * scale),
  underlinePosition: font.tables.post.underlinePosition,
  underlineThickness: font.tables.post.underlineThickness,
  boundingBox: {
    xMin: font.tables.head.xMin,
    xMax: font.tables.head.xMax,
    yMin: font.tables.head.yMin,
    yMax: font.tables.head.yMax,
  },
  resolution: 1000,
};

writeFileSync(OUT, JSON.stringify(json));
console.log(
  `${OUT}: ${Object.keys(glyphs).length} glyphs, ${(JSON.stringify(json).length / 1024).toFixed(1)} KB`
);
