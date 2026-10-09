import { SCREENS_ATLAS_RECTS } from '#utils/packedTextures.js';

// The projects on the Projects island, one per project plate. Stepping on a
// plate selects its project: the projects portal shows `screen` (a tile of
// the screens atlas) and opens `url`. `plateMaterial` is the plate's GLB
// material, as named in Blender
export const PROJECTS = {
  hoHoNo: {
    url: 'https://ho-ho-no.vercel.app/',
    screen: SCREENS_ATLAS_RECTS.hoHoNo,
    plateMaterial: 'portalPlate',
  },
  doanTenConVat: {
    url: 'https://doan-ten-con-vat.vercel.app/',
    screen: SCREENS_ATLAS_RECTS.doanTenConVat,
    plateMaterial: 'seaPlate',
  },
  halloweenChallenge: {
    url: 'https://halloween-challenge.vercel.app/',
    screen: SCREENS_ATLAS_RECTS.halloweenChallenge,
    plateMaterial: 'halloweenPlate',
  },
};
