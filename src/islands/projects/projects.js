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
  aGooseTale: {
    url: 'https://mikefernandez-pro.github.io/a-goose-tale/',
    screen: SCREENS_ATLAS_RECTS.aGooseTale,
    plateMaterial: 'seaPlate',
  },
  justASimpleTree: {
    url: 'https://justasimpletree.com/',
    screen: SCREENS_ATLAS_RECTS.justASimpleTree,
    plateMaterial: 'halloweenPlate',
  },
};
