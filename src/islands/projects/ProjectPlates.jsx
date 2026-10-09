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

import PressurePlateAudio from '#assets/sounds/pressure-plate.mp3';

// Shared by reference across all plate materials, so mutating it updates every plate
const PLATE_EMISSIVE_COLOR = new THREE.Color('#68CFF2');
// Glow of the selected project's plate, set by the debug control
const plateSettings = { activeIntensity: 3.56 };

const createPlateAnimation = (
  material,
  lightIndex,
  pressurePlateSoundEffect
) => {
  const progress = { value: 0 };

  return gsap.to(progress, {
    duration: 0.2,
    value: 1,
    paused: true,
    onStart: () => {
      pressurePlateSoundEffect.volume(SOUND_VOLUMES.pressurePlate);
      pressurePlateSoundEffect.seek(0);
      pressurePlateSoundEffect.play();
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

  const pressurePlateSoundEffect = useMemo(
    () =>
      new Howl({
        src: [PressurePlateAudio],
        autoplay: false,
        volume: SOUND_VOLUMES.pressurePlate,
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
    // One plate per project, keyed by project id
    const plates = {};
    for (const [projectId, project] of Object.entries(PROJECTS)) {
      plates[projectId] = { material: island.materials[project.plateMaterial] };
    }

    for (const plate in plates) {
      plates[plate].material.emissive = PLATE_EMISSIVE_COLOR;
      plates[plate].material.emissiveIntensity = 0;

      plates[plate].animation = createPlateAnimation(
        plates[plate].material,
        PLATE_LIGHT_INDEX[plate],
        pressurePlateSoundEffect
      );
    }

    const unsubSelectedProject = subscribeWhenSet(
      state => state.selectedProject,
      (selectedProject, previousProject) => {
        plates[selectedProject].animation.play();
        if (previousProject) {
          plates[previousProject].animation.reverse();
        }
      }
    );

    return () => {
      for (const plate in plates) {
        plates[plate].animation.kill();
        delete plates[plate].animation;
      }
      unsubSelectedProject();
    };
  }, [island]);

  return null;
};

export { ProjectPlates };
