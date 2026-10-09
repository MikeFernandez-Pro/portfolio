import { useEffect, useRef } from 'react';

import { Indicators } from './Indicators.jsx';
import { InteractiveElementSensors } from './InteractiveElementSensors.jsx';
import { interactiveElementsData } from './interactiveElementsData.js';
import { useStore } from '#store';

const InteractiveElements = () => {
  const selectedProjectRef = useRef(useStore.getState().selectedProject);
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
            selectedProjectRef
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
            selectedProjectRef
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

    const unsubSelectedProject = useStore.subscribe(
      state => (selectedProjectRef.current = state.selectedProject)
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
      unsubSelectedProject();
    };
  }, []);

  return (
    <>
      <InteractiveElementSensors
        interactiveElementsData={interactiveElementsData}
      />

      <Indicators
        interactiveElementsData={interactiveElementsData}
        selectedProjectRef={selectedProjectRef}
        interactionPromptRef={interactionPromptRef}
      />
    </>
  );
};

export { InteractiveElements };
