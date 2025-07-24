import { useStore } from '../../store/ZustandStorage.jsx';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';

import { InteractiveLinks } from './InteractiveLinks.jsx';
import { InteractivElementsColliders } from './InteractivElementsColliders.jsx';
import {
  interactiveElementsIds,
  interactiveElementsLinks,
  createInteractionAnimation,
} from './interactiveElementsUtils.js';

const InteractiveElements = () => {
  const activePlateRef = useRef(useStore.getState().activePlate);
  const magicGlyphActivation = useStore(state => state.magicGlyphActivation);
  const interactionPromptRef = useRef();

  const activateLink = useCallback(link => {
    if (link && interactionPromptRef.current) {
      // Do not activate portal if no plate is selected
      if (
        link.userData.id === interactiveElementsIds.portal &&
        !activePlateRef.current
      )
        return;

      const child = interactionPromptRef.current.getObjectByName(
        link.userData.id
      );

      if (child) {
        if (!link.userData.interactionAnimation) {
          link.userData.interactionAnimation =
            createInteractionAnimation(child);
        }

        link.userData.interactionAnimation.play();
      }
    }
  }, []);

  const deactivateLink = useCallback(link => {
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
  }, []);

  const activatePlate = useCallback(interactiveElementData => {
    const interactiveElementId = interactiveElementData.userData.id;
    if (interactiveElementId === activePlateRef.current) return;

    useStore.setState({ activePlate: interactiveElementId });
  }, []);

  const linksInstancesDatas = useMemo(
    () => ({
      [interactiveElementsIds.mailBox]: {
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
      [interactiveElementsIds.linkedIn]: {
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
      [interactiveElementsIds.vercel]: {
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
      [interactiveElementsIds.portal]: {
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
        position: [-16.1, 5.72, -37.26],
        rotation: [0.43, 0, 0],
        scale: [1.9, 0.97, 3],
      },
      [interactiveElementsIds.statue]: {
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
      [interactiveElementsIds.magicGlyph]: {
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
      [interactiveElementsIds.portalPlate]: {
        key: interactiveElementsIds.portalPlate,
        userData: {
          id: interactiveElementsIds.portalPlate,
          startInteraction: activatePlate,
        },
        position: [-15.085, 4.4, -32.45],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      [interactiveElementsIds.seaPlate]: {
        key: interactiveElementsIds.seaPlate,
        userData: {
          id: interactiveElementsIds.seaPlate,
          startInteraction: activatePlate,
        },
        position: [-15.085, 4.4, -34.495],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
      [interactiveElementsIds.halloweenPlate]: {
        key: interactiveElementsIds.halloweenPlate,
        userData: {
          id: interactiveElementsIds.halloweenPlate,
          startInteraction: activatePlate,
        },
        position: [-17.14, 4.4, -34.495],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    }),
    []
  );

  useEffect(() => {
    const keyDownHandler = event => {
      if (event.key === 'Enter') {
        const activatedInteractiveElement =
          useStore.getState().activatedInteractiveElement.current;
        if (activatedInteractiveElement) {
          const activatedInteractiveElementData =
            linksInstancesDatas[activatedInteractiveElement];

          activatedInteractiveElement === interactiveElementsIds.mailBox
            ? (window.location.href = 'mailto:contact@mike-fernandez.dev')
            : activatedInteractiveElement === interactiveElementsIds.portal
              ? window.open(
                  activatedInteractiveElementData.userData.href[
                    activePlateRef.current
                  ],
                  '_blank'
                )
              : window.open(
                  activatedInteractiveElementData.userData.href,
                  '_blank'
                );
        }
      }
    };

    window.addEventListener('keydown', keyDownHandler);

    const unsubActiveInteractiveElement = useStore.subscribe(
      state => state.activatedInteractiveElement,
      activatedInteractiveElement => {
        if (activatedInteractiveElement.current) {
          const activatedInteractiveElementData =
            linksInstancesDatas[activatedInteractiveElement.current];
          activatedInteractiveElementData.userData?.startInteraction(
            activatedInteractiveElementData
          );
        }

        if (activatedInteractiveElement.prev) {
          const activatedInteractiveElementData =
            linksInstancesDatas[activatedInteractiveElement.prev];
          activatedInteractiveElementData.userData?.closeInteraction(
            activatedInteractiveElementData
          );
        }
      }
    );

    const unsubActivaPlate = useStore.subscribe(
      state => (activePlateRef.current = state.activePlate)
    );

    return () => {
      for (const link of Object.values(linksInstancesDatas)) {
        if (link.userData.interactionAnimation) {
          link.userData.interactionAnimation?.kill();
          delete link.userData.interactionAnimation;
        }
      }

      window.removeEventListener('keydown', keyDownHandler);
      unsubActiveInteractiveElement();
      unsubActivaPlate();
    };
  }, []);

  return (
    <>
      <InteractivElementsColliders linksInstancesDatas={linksInstancesDatas} />

      <InteractiveLinks
        linksInstancesDatas={linksInstancesDatas}
        activePlateRef={activePlateRef}
        interactionPromptRef={interactionPromptRef}
      />
    </>
  );
};

export { InteractiveElements };
