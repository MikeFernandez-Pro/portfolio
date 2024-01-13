import { create } from 'zustand'    
import { subscribeWithSelector } from 'zustand/middleware'  


export const useStore = create(subscribeWithSelector((set) => ({

    isMobile: false,
    disableSounds: undefined,

    joystickAngle: undefined,
    joysticActivated: false,

    revealScene: false,

    runExperience: false,

    /**
     * Magic Circle activation handler
     */
    magicGlyphActivation: false,

    /**
     * Projects Portals activation handlers
     */

    activePlate: undefined,

    portalPlateMaterial: undefined,
    seaPlateMaterial: undefined,
    halloweenPlateMaterial: undefined,

    characterPosition: undefined,
    isCharacterMoving: false,
})))

