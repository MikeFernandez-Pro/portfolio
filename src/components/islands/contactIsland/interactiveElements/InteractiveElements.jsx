import { useStore } from '#store/ZustandStorage.jsx';
import { useEffect, useRef } from 'react';

import { InteractiveLinks } from './InteractiveLinks.jsx';
import { InteractivElementsColliders } from './InteractivElementsColliders.jsx';
import { interactiveElementsData } from './interactiveElementsData.js';

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

          activatedInteractiveElementData.userData?.activateLink(
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
          activatedInteractiveElementData.userData?.closeInteraction(
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
