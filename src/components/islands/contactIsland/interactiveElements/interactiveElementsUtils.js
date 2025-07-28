import gsap from 'gsap';

import { useStore } from '#store/ZustandStorage.jsx';
import { PORTAL_ID, MAIL_BOX_URL } from './interactiveElementsData.js';

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

const triggerInteractiveLink = (link, interactionPromptRef, activePlateRef) => {
  if (link && interactionPromptRef.current) {
    // Do not activate portal if no plate is selected
    if (link.userData.id === PORTAL_ID && !activePlateRef.current) return;

    const child = interactionPromptRef.current.getObjectByName(
      link.userData.id
    );

    if (child) {
      if (!link.userData.interactionAnimation) {
        link.userData.interactionAnimation = createInteractionAnimation(child);
      }

      link.userData.interactionAnimation.play();
    }
  }
};

const untriggerInteractiveLink = (link, interactionPromptRef) => {
  if (link && interactionPromptRef.current) {
    const child = interactionPromptRef.current.getObjectByName(
      link.userData.id
    );

    if (child) {
      if (link.userData.interactionAnimation) {
        link.userData.interactionAnimation.reverse();
      }
    }
  }
};

const activateInteractiveElementLink = (url, isMailBox = false) => {
  const activatedInteractiveElement =
    useStore.getState().activatedInteractiveElement.current;

  if (activatedInteractiveElement) {
    if (isMailBox) {
      window.location.href = MAIL_BOX_URL;
    } else {
      window.open(url, '_blank');
    }
  }
};

const activateMagicGlyph = () => {
  const magicGlyphActivation = useStore.getState().magicGlyphActivation;

  if (!magicGlyphActivation) {
    useStore.setState({ magicGlyphActivation: true });
  }
};

const activatePortalPlate = (interactiveElementData, activePlateRef) => {
  const interactiveElementId = interactiveElementData.userData.id;
  if (interactiveElementId === activePlateRef.current) return;

  useStore.setState({ activePlate: interactiveElementId });
};

export {
  triggerInteractiveLink,
  untriggerInteractiveLink,
  activateInteractiveElementLink,
  activateMagicGlyph,
  activatePortalPlate,
};
