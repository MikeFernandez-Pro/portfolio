import { create } from 'zustand'    
import { subscribeWithSelector } from 'zustand/middleware'  

export const useStore = create(subscribeWithSelector((set) => ({

    experienceStarted: false,
    soundActivated: true,

    joystickAngle: undefined,

    //Magic Circle activation handler
    magicGlyphActivation: false,

    /**
     * Projects Portals activation handlers
     */

    activePlate: undefined,

    characterPosition: undefined,
    isCharacterMoving: false,
})))

