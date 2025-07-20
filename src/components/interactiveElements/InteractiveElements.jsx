import { useStore } from '../../store/ZustandStorage.jsx';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';

import { InteractiveLinks } from './InteractiveLinks.jsx';
import { InteractivElementsColliders } from './InteractivElementsColliders.jsx';
import {
  interactiveElementsIds,
  interactiveElementsLinks,
} from './interactiveElementsConstants.js';

const InteractiveElements = () => {
  const activePlateRef = useRef(useStore.getState().activePlate);
  const magicGlyphActivation = useStore(state => state.magicGlyphActivation);
  const interactionPromptRef = useRef();
  const activeLink = useRef();
  const gsapContext = useRef();

  const activateLink = useCallback(link => {
    if (link.id === interactiveElementsIds.portal && !activePlateRef.current)
      return;
    if (activeLink && !activeLink.current && interactionPromptRef.current) {
      activeLink.current = link;
      const child = interactionPromptRef.current.getObjectByName(link.id);

      if (child) {
        gsapContext.current.add(() => {
          gsap.to(child.scale, {
            x: link.textScale,
            y: link.textScale,
            z: link.textScale,
            duration: 0.3,
            ease: 'back',
            overwrite: true,
          });
        });
      }
    }
  }, []);

  const deactivateLink = useCallback(() => {
    if (activeLink && activeLink.current && interactionPromptRef.current) {
      const child = interactionPromptRef.current.getObjectByName(
        activeLink.current.id
      );
      activeLink.current = undefined;

      if (child) {
        gsapContext.current.add(() => {
          gsap.to(child.scale, {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.3,
            overwrite: true,
          });
        });
      }
    }
  }, []);

  const activatePlate = useCallback(userData => {
    if (userData.id === activePlateRef.current) return;

    useStore.setState(state => ({
      activePlate: userData.id,
    }));
  }, []);

  const linksInstancesDatas = useMemo(
    () => [
      {
        key: interactiveElementsIds.mailBox,
        userData: {
          id: interactiveElementsIds.mailBox,
          textPosition: [-4.47, 2.45, -8.14],
          textRotationY: 0.4,
          textScale: 0.8,
          startInteraction: activateLink,
          closeInteraction: deactivateLink,
        },
        position: [-4.24, 0.55, -8.07],
        rotation: [0, 0.49, 0],
        scale: [0.9, 0.9, 0.9],
      },
      {
        key: interactiveElementsIds.linkedIn,
        userData: {
          id: interactiveElementsIds.linkedIn,
          textPosition: [-3.37, 2.45, -8.63],
          textRotationY: 0.4,
          textScale: 0.8,
          href: interactiveElementsLinks.linkedIn,
          startInteraction: activateLink,
          closeInteraction: deactivateLink,
        },
        position: [-3.11, 0.5, -8.64],
        rotation: [0, 0.49, 0],
        scale: [0.9, 0.9, 0.9],
      },
      {
        key: interactiveElementsIds.vercel,
        userData: {
          id: interactiveElementsIds.vercel,
          textPosition: [-2.26, 2.45, -9.27],
          textRotationY: 0.4,
          textScale: 0.8,
          href: interactiveElementsLinks.vercel,
          startInteraction: activateLink,
          closeInteraction: deactivateLink,
        },
        position: [-2.03, 0.5, -9.2],
        rotation: [0, 0.48, 0],
        scale: [0.9, 0.9, 0.9],
      },
      {
        key: interactiveElementsIds.portal,
        userData: {
          id: interactiveElementsIds.portal,
          textPosition: [-16.79, 6.16, -36.86],
          textRotationY: 0,
          textScale: 1,
          href: {
            portalPlate: interactiveElementsLinks.portalPlate,
            seaPlate: interactiveElementsLinks.seaPlate,
            halloweenPlate: interactiveElementsLinks.halloweenPlate,
          },
          startInteraction: activateLink,
          closeInteraction: deactivateLink,
        },
        position: [-16.1, 5.24, -37.49],
        rotation: [0.43, 0, 0],
        scale: [1.04, 0.97, 3],
      },
      {
        key: interactiveElementsIds.statue,
        userData: {
          id: interactiveElementsIds.statue,
          textPosition: [-9.77, 8, -58.8],
          textRotationY: 0,
          textScale: 0.9,
          href: interactiveElementsLinks.statue,
          startInteraction: activateLink,
          closeInteraction: deactivateLink,
        },
        position: [-9.76, 6.43, -58.2],
        rotation: [0, 0, 0],
        scale: [1.5, 1, 1.5],
      },
      {
        key: interactiveElementsIds.magicGlyph,
        userData: {
          id: interactiveElementsIds.magicGlyph,
          startInteraction: () => {
            if (!magicGlyphActivation)
              useStore.setState({ magicGlyphActivation: true });
          },
        },
        position: [6.34, 2.69, -33.53],
        rotation: [0, -0.15, 0],
        scale: [2.85, 0.35, 2.85],
      },
      {
        key: interactiveElementsIds.portalPlate,
        userData: {
          id: interactiveElementsIds.portalPlate,
          startInteraction: activatePlate,
        },
        position: [-15.085, 4.4, -32.45],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      {
        key: interactiveElementsIds.seaPlate,
        userData: {
          id: interactiveElementsIds.seaPlate,
          startInteraction: activatePlate,
        },
        position: [-15.085, 4.4, -34.495],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      {
        key: interactiveElementsIds.halloweenPlate,
        userData: {
          id: interactiveElementsIds.halloweenPlate,
          startInteraction: activatePlate,
        },
        position: [-17.14, 4.4, -34.495],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    ],
    []
  );

  const startInteraction = useCallback(event => {
    if (event.key === 'Enter') {
      if (activeLink) {
        activeLink.current.id === interactiveElementsIds.mailBox
          ? (window.location.href = 'mailto:contact@mike-fernandez.dev')
          : activeLink.current.id === interactiveElementsIds.portal
            ? window.open(
                activeLink.current.href[activePlateRef.current],
                '_blank'
              )
            : window.open(activeLink.current.href, '_blank');
      }
    }
  }, []);

  useEffect(() => {
    gsapContext.current = gsap.context(() => {}, interactionPromptRef);

    window.addEventListener('keydown', startInteraction);

    const unsubActivaPlate = useStore.subscribe(
      state => (activePlateRef.current = state.activePlate)
    );

    return () => {
      gsapContext.current.revert();
      window.removeEventListener('keydown', startInteraction);
      unsubActivaPlate();
    };
  }, []);

  return (
    <>
      <InteractivElementsColliders linksInstancesDatas={linksInstancesDatas} />

      <InteractiveLinks
        activeLink={activeLink}
        activePlateRef={activePlateRef}
        interactionPromptRef={interactionPromptRef}
      />
    </>
  );
};

export { InteractiveElements };
