import { useEffect, useMemo } from 'react';
import { useControls } from '#debug/useControls.jsx';
import * as THREE from 'three/webgpu';
import gsap from 'gsap';
import { Howl } from 'howler';

import { subscribeWhenSet, useStore } from '#store';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';
import {
  pointLights,
  PLATE_LIGHT_INDEX,
} from '#islands/world/pointLights/pointLights.js';

import { PROJECTS } from './projects.js';

import PlateAudio from '#assets/sounds/pressure-plate.mp3';

// Shared by reference across all plate materials, so mutating it updates every plate
const PLATE_EMISSIVE_COLOR = new THREE.Color('#68CFF2');
// Glow of the selected project's plate, set by the debug control
const plateSettings = { activeIntensity: 3.56 };

const createPlateAnimation = (material, lightIndex, plateSoundEffect) => {
  const progress = { value: 0 };

  return gsap.to(progress, {
    duration: 0.2,
    value: 1,
    paused: true,
    onStart: () => {
      plateSoundEffect.volume(SOUND_VOLUMES.projectPlate);
      plateSoundEffect.seek(0);
      plateSoundEffect.play();
    },
    onUpdate: () => {
      material.emissiveIntensity =
        progress.value * plateSettings.activeIntensity;
      // The plate's fake point light follows the same press/release ramp
      pointLights.plate.factors.value.setComponent(lightIndex, progress.value);
    },
  });
};

const ProjectPlates = props => {
  const { island } = props;

  const plateSoundEffect = useMemo(
    () =>
      new Howl({
        src: [PlateAudio],
        autoplay: false,
        volume: SOUND_VOLUMES.projectPlate,
      }),
    []
  );

  useControls('Plates', {
    emissiveColor: {
      value: `#${PLATE_EMISSIVE_COLOR.getHexString()}`,
      onChange: value => {
        PLATE_EMISSIVE_COLOR.set(value);
      },
    },
    activeIntensity: {
      value: plateSettings.activeIntensity,
      min: 0,
      max: 20,
      step: 0.01,
      onChange: value => {
        plateSettings.activeIntensity = value;

        // Reflect the new intensity on the selected project's plate
        const selectedProject = useStore.getState().selectedProject;
        if (selectedProject) {
          island.materials[
            PROJECTS[selectedProject].plateMaterial
          ].emissiveIntensity = value;
        }
      },
    },
  });

  useEffect(() => {
    // One press animation per project plate, keyed by project id
    const plates = Object.fromEntries(
      Object.entries(PROJECTS).map(([projectId, project]) => {
        const material = island.materials[project.plateMaterial];
        material.emissive = PLATE_EMISSIVE_COLOR;
        material.emissiveIntensity = 0;
        const animation = createPlateAnimation(
          material,
          PLATE_LIGHT_INDEX[projectId],
          plateSoundEffect
        );
        return [projectId, animation];
      })
    );

    const unsubSelectedProject = subscribeWhenSet(
      state => state.selectedProject,
      (selectedProject, previousProject) => {
        plates[selectedProject].play();
        if (previousProject) plates[previousProject].reverse();
      }
    );

    return () => {
      Object.values(plates).forEach(animation => animation.kill());
      unsubSelectedProject();
    };
  }, [island]);

  return null;
};

export { ProjectPlates };
