import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useStore = create(
  subscribeWithSelector(() => ({
    experienceStarted: false,
    // Every material pipeline is built (PrecompileScene): the loader gives
    // way to the Enter button and the intro peek can start
    sceneReady: false,
    // Movement/jump input ignored during the intro camera pan
    introControlsLocked: false,

    joystickAngle: undefined,

    activatedInteractiveElement: { prev: undefined, current: undefined },

    // Set once the character steps on the skills glyph; never goes back
    skillsIslandAwake: false,

    // Project picked on the project plates (projects.js id); the projects
    // portal shows and opens it
    selectedProject: undefined,

    characterPosition: undefined,
    // Written by the controller from the contact solve; the grass trample
    // reads it for takeoff / landing impulses
    characterGrounded: true,

    // Debug: free OrbitControls camera (pauses the third-person follow)
    freeCameraActive: false,
  }))
);
