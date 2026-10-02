import { useEffect, useRef } from 'react';

import { InteractiveLinks } from './InteractiveLinks.jsx';
import { InteractivElementsColliders } from './InteractivElementsColliders.jsx';
import { interactiveElementsData } from './interactiveElementsData.js';
import { useStore } from '#store/ZustandStorage.jsx';

const InteractiveElements = () => {
  const activePlateRef = useRef(useStore.getState().activePlate);
  const interactionPromptRef = useRef();

  useEffect(() => {
    const keyDownHandler = event => {
      if (event.key === 'Enter') {
        const activatedInteractiveElement =
          useStore.getState().activatedInteractiveElement.current;
        if (activatedInteractiveElement) {
          const activatedInteractiveElementData =
            interactiveElementsData[activatedInteractiveElement];

          // Glyph and plates have no link to open
          activatedInteractiveElementData.userData?.activateLink?.(
            activePlateRef
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
            interactiveElementsData[activatedInteractiveElement.current];
          activatedInteractiveElementData.userData?.startInteraction(
            activatedInteractiveElementData,
            interactionPromptRef,
            activePlateRef
          );
        }

        if (activatedInteractiveElement.prev) {
          const activatedInteractiveElementData =
            interactiveElementsData[activatedInteractiveElement.prev];
          // Glyph and plates have nothing to close
          activatedInteractiveElementData.userData?.closeInteraction?.(
            activatedInteractiveElementData,
            interactionPromptRef
          );
        }
      }
    );

    const unsubActivaPlate = useStore.subscribe(
      state => (activePlateRef.current = state.activePlate)
    );

    return () => {
      for (const link of Object.values(interactiveElementsData)) {
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
      <InteractivElementsColliders
        interactiveElementsData={interactiveElementsData}
      />

      <InteractiveLinks
        interactiveElementsData={interactiveElementsData}
        activePlateRef={activePlateRef}
        interactionPromptRef={interactionPromptRef}
      />
    </>
  );
};

export { InteractiveElements };
