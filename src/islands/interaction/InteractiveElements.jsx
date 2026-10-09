import { useEffect, useRef } from 'react';

import { useStore } from '#store';

import { Indicators } from './Indicators.jsx';
import { InteractiveElementSensors } from './InteractiveElementSensors.jsx';
import { ELEMENTS_BY_ID, INTERACTIVE_ELEMENTS } from './interactiveElements.js';
import {
  enterElement,
  killIndicatorAnimations,
  leaveElement,
  openLink,
} from './interactions.js';

// Every interactive element: its sensor zones, the link indicators, and the
// dispatch of entering / leaving a zone and of Enter
const InteractiveElements = () => {
  const indicatorsRef = useRef();

  useEffect(() => {
    const keyDownHandler = event => {
      if (event.key !== 'Enter') return;
      const current = useStore.getState().activatedInteractiveElement.current;
      // Plates and the glyph have no link to open
      if (current && ELEMENTS_BY_ID[current].kind === 'link') {
        openLink(ELEMENTS_BY_ID[current]);
      }
    };

    window.addEventListener('keydown', keyDownHandler);

    const unsubActivatedElement = useStore.subscribe(
      state => state.activatedInteractiveElement,
      ({ current, prev }) => {
        if (current)
          enterElement(ELEMENTS_BY_ID[current], indicatorsRef.current);
        if (prev) leaveElement(ELEMENTS_BY_ID[prev]);
      }
    );

    return () => {
      killIndicatorAnimations();
      window.removeEventListener('keydown', keyDownHandler);
      unsubActivatedElement();
    };
  }, []);

  return (
    <>
      <InteractiveElementSensors elements={INTERACTIVE_ELEMENTS} />
      <Indicators
        links={INTERACTIVE_ELEMENTS.filter(element => element.kind === 'link')}
        ref={indicatorsRef}
      />
    </>
  );
};

export { InteractiveElements };
