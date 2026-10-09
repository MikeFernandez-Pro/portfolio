import gsap from 'gsap';

import { useStore } from '#store';
import { linkHref } from './interactiveElements.js';

// Indicator mesh names (InteractiveElements' <Merged> instances)
export const INDICATOR_RING = 'IndicatorRing';
export const INDICATOR_ENTER_TILE = 'IndicatorEnterTile';

// Per link id: the indicator animation (diamond ring -> Enter tile), built
// on first use
const indicatorAnimations = new Map();

const createIndicatorAnimation = indicator => {
  const ring = indicator.getObjectByName(INDICATOR_RING);
  const enterTile = indicator.getObjectByName(INDICATOR_ENTER_TILE);

  const tl = gsap.timeline({ paused: true });

  tl.to(ring.rotation, {
    z: Math.PI / 4,
    duration: 0.1,
    ease: 'power2.in',
  });

  // Scale down to an epsilon instead of 0: three r185 Matrix4.decompose
  // returns scale (1,1,1) for zero-determinant matrices, which makes
  // drei <Merged> instances reappear at full size
  tl.to(
    ring.scale,
    {
      x: 0.001,
      y: 0.001,
      z: 0.001,
      duration: 0.15,
      ease: 'power2.out',
    },
    '>' // Start exactly when previous animation ends
  );

  tl.to(
    enterTile.scale,
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

/**
 * The character stepped into `element`'s sensor zone. `indicators`: the
 * group holding one indicator per link, named by link id.
 */
export const enterElement = (element, indicators) => {
  switch (element.kind) {
    case 'link': {
      // No indicator while there is nothing to open (the projects portal
      // before a project is selected)
      if (!indicators || !linkHref(element)) return;
      const indicator = indicators.getObjectByName(element.id);
      if (!indicator) return;
      if (!indicatorAnimations.has(element.id)) {
        indicatorAnimations.set(
          element.id,
          createIndicatorAnimation(indicator)
        );
      }
      indicatorAnimations.get(element.id).play();
      break;
    }
    case 'plate':
      if (element.id !== useStore.getState().selectedProject) {
        useStore.setState({ selectedProject: element.id });
      }
      break;
    case 'glyph':
      if (!useStore.getState().skillsIslandAwake) {
        useStore.setState({ skillsIslandAwake: true });
      }
      break;
  }
};

// The character left `element`'s sensor zone
export const leaveElement = element => {
  if (element.kind === 'link') indicatorAnimations.get(element.id)?.reverse();
};

// Enter (or a tap on the indicator, mobile): opens the link while the
// character stands in a sensor zone
export const openLink = element => {
  if (!useStore.getState().activatedInteractiveElement.current) return;
  const href = linkHref(element);
  if (!href) return;
  if (href.startsWith('mailto:')) {
    window.location.href = href;
  } else {
    window.open(href, '_blank');
  }
};

export const killIndicatorAnimations = () => {
  indicatorAnimations.forEach(animation => animation.kill());
  indicatorAnimations.clear();
};
