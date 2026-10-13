import { Font } from 'three/addons/loaders/FontLoader.js';

import fontJson from '#assets/fonts/metamorphous.typeface.json';

// Metamorphous (Sorkin Type Co, SIL Open Font License 1.1: OFL.txt next to
// the font files) outlines for the floating skills and the sleep Z. The JSON only
// holds the glyphs they draw: add a character to CHARS in
// scripts/make-typeface.mjs and rerun it before using a new one
export const METAMORPHOUS = new Font(fontJson);
