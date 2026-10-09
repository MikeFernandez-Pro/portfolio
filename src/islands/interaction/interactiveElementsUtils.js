import gsap from 'gsap';

import { useStore } from '#store';
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

  // Scale down to an epsilon instead of 0: three r185 Matrix4.decompose
  // returns scale (1,1,1) for zero-determinant matrices, which makes
  // drei <Merged> instances reappear at full size
  tl.to(
    InteractionIndicatorChild.scale,
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

const triggerInteractiveLink = (
  link,
  interactionPromptRef,
  selectedProjectRef
) => {
  if (link && interactionPromptRef.current) {
    // No portal link until a project is selected
    if (link.userData.id === PORTAL_ID && !selectedProjectRef.current) return;

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

// A project plate: its element id is the project it selects
const selectProject = interactiveElementData => {
  const projectId = interactiveElementData.userData.id;
  if (projectId === useStore.getState().selectedProject) return;

  useStore.setState({ selectedProject: projectId });
};

export {
  triggerInteractiveLink,
  untriggerInteractiveLink,
  activateInteractiveElementLink,
  activateMagicGlyph,
  selectProject,
};
