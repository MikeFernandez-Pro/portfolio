const interactiveElementsIds = {
  mailBox: 'mailBox',
  linkedIn: 'linkedIn',
  vercel: 'vercel',
  portal: 'portal',
  statue: 'statue',
  magicGlyph: 'magicGlyph',
  portalPlate: 'portalPlate',
  seaPlate: 'seaPlate',
  halloweenPlate: 'halloweenPlate',
};

const interactiveElementsCount = Object.keys(interactiveElementsIds).length;

const interactiveElementsLinks = {
  linkedIn: 'https://www.linkedin.com/in/mike-fernandez-front-end-dev/',
  vercel: 'https://vercel.com/mikefernandez-pro',
  portalPlate: 'https://magic-portal-threejs.vercel.app/',
  seaPlate: 'https://raging-sea-shader-flame.vercel.app/',
  halloweenPlate: 'https://halloween-challenge.vercel.app/',
  statue: '/CV_Portfolio_Mike.pdf',
};

export {
  interactiveElementsCount,
  interactiveElementsIds,
  interactiveElementsLinks,
};
