import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useStore = create(
  subscribeWithSelector(set => ({
    experienceStarted: false,

    joystickAngle: undefined,

    activatedInteractiveElement: { prev: undefined, current: undefined },

    //Magic Glyph activation handler
    magicGlyphActivation: false,

    // Portal activation handlers
    activePlate: undefined,

    characterPosition: undefined,
    isCharacterMoving: false,
  }))
);
