import { create } from 'zustand'    
import { subscribeWithSelector } from 'zustand/middleware'  


export const useStore = create(subscribeWithSelector((set) => ({

    isMobile: false,

    joystickAngle: 0,
    joysticActivated: false,

    runExperience: false,

    /**
     * Magic Circle activation handler
     */
    magicCircleActivation: false,


    /**
     * Projects Portals activation handlers
     */

    activePlate: null,
    prevPlate: null,

    portalPlateMaterial: null,
    seaPlateMaterial: null,
    galaxyPlateMaterial: null,

    characterPosition: null,
})))

