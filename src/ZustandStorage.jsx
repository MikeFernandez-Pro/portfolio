import { create } from 'zustand'    
import { subscribeWithSelector } from 'zustand/middleware'  


export const useStore = create(subscribeWithSelector((set) => ({

    isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),

    /**
     * Main island initialization handler
     */
    islandMounted: false,
    setIslandMounted: () => set({ islandMounted: true }),

    /**
     * Links handler
     */
    activeLink: false,
    currentLink: null,

    /**
     * Magic Circle activation handler
     */
    magicCircleActivation: false,
    setMagicCircleActivation: () => {
        set(state => !state.magicCircleActivation ? { magicCircleActivation: true } : {})
    },


    /**
     * Projects Portals activation handlers
     */

    activePlate: null,
    prevPlate: null,
    setActivePlate: (plate) => {
        set((state) =>
            state.activePlate !== plate ?
                {
                    prevPlate: state.activePlate,
                    activePlate: plate
                } : {}
        )
    },

    portalPlateMaterial: null,
    seaPlateMaterial: null,
    galaxyPlateMaterial: null,
    setPortalPlateMaterial: (material) => set({ portalPlateMaterial: material }),

})))

