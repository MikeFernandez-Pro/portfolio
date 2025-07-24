import gsap from 'gsap';

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

const createInteractionAnimation = child => {
  const InteractionIndicatorChild = child.getObjectByName(
    'InteractionIndicatorMesh'
  );
  const ActivationIndicatorChild = child.getObjectByName(
    'ActivationIndicatorMesh'
  );

  const tl = gsap.timeline({ paused: true });

  tl.to(InteractionIndicatorChild.rotation, {
    z: Math.PI / 4,
    duration: 0.1,
    ease: 'power2.in',
  });

  tl.to(
    InteractionIndicatorChild.scale,
    {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.15,
      ease: 'power2.out',
    },
    '>' // Start exactly when previous animation ends
  );

  tl.to(
    ActivationIndicatorChild.scale,
    {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.15,
      ease: 'power2.out',
    },
    '<' // Start at same time as previous animation
  );

  return tl;
};

export {
  interactiveElementsCount,
  interactiveElementsIds,
  interactiveElementsLinks,
  createInteractionAnimation,
};
