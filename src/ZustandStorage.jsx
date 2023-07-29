import { create } from 'zustand'

export const useStore = create((set) => ({
    islandMounted: false,
    setIslandMounted: () => set({islandMounted: true}),
    magicCircleActivation: false,
    setMagicCircleActivation: () => set({magicCircleActivation: true})
}))

