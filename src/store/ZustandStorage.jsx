import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useStore = create(
  subscribeWithSelector(() => ({
    experienceStarted: false,

    joystickAngle: undefined,

    activatedInteractiveElement: { prev: undefined, current: undefined },

    //Magic Glyph activation handler
    magicGlyphActivation: false,

    // Portal activation handlers
    activePlate: undefined,

    characterPosition: undefined,
    isCharacterMoving: false,

    // Debug: free OrbitControls camera (pauses the third-person follow)
    freeCameraActive: false,

    // Respawn animation targets (registered by their components)
    characterRespawnUniforms: null,
    spiralRespawnUniforms: null,
    spiralRespawnMesh: null,

    // Death disintegration burst (registered by DeathParticles)
    deathParticlesMesh: null,
    deathParticlesUniforms: null,
  }))
);
