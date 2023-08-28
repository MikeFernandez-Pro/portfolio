import { create } from 'zustand'    
import { subscribeWithSelector } from 'zustand/middleware'  


export const useStore = create(subscribeWithSelector((set) => ({

    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),

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

})))

