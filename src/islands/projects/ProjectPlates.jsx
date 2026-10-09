import { useEffect, useMemo } from 'react';
import { useControls } from '#debug/useControls.jsx';
import * as THREE from 'three/webgpu';
import gsap from 'gsap';
import { Howl } from 'howler';

import { useStore } from '#store';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';
import {
  PLATE_LIGHT_INDEX,
  plateLightsUniforms,
} from '#islands/world/pointLights/islandPointLights.js';

import PressurePlateAudio from '#assets/sounds/pressure-plate.mp3';

// Shared by reference across all plate materials, so mutating it updates every plate
const PLATE_EMISSIVE_COLOR = new THREE.Color('#68CFF2');
let plateActiveIntensity = 3.56;

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
      material.emissiveIntensity = progress.value * plateActiveIntensity;
      // The plate's fake point light follows the same press/release ramp
      plateLightsUniforms.uPlateLightFactors.value.setComponent(
        lightIndex,
        progress.value
      );
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
      value: plateActiveIntensity,
      min: 0,
      max: 20,
      step: 0.01,
      onChange: value => {
        plateActiveIntensity = value;

        // Reflect the new intensity on the currently activated plate
        const activePlate = useStore.getState().activePlate;
        if (activePlate && island.materials[activePlate]) {
          island.materials[activePlate].emissiveIntensity = value;
        }
      },
    },
  });

  useEffect(() => {
    // Plate ids match the GLB material names
    const plates = {
      seaPlate: { material: island.materials.seaPlate },
      halloweenPlate: { material: island.materials.halloweenPlate },
      portalPlate: { material: island.materials.portalPlate },
    };

    for (const plate in plates) {
      plates[plate].material.emissive = PLATE_EMISSIVE_COLOR;
      plates[plate].material.emissiveIntensity = 0;

      plates[plate].animation = createPlateAnimation(
        plates[plate].material,
        PLATE_LIGHT_INDEX[plate],
        pressurePlateSoundEffect
      );
    }

    const unsubActivePlate = useStore.subscribe(
      state => state.activePlate,
      (activePlate, prevPlate) => {
        plates[activePlate].animation.play();
        if (prevPlate) {
          plates[prevPlate].animation.reverse();
        }
      }
    );

    return () => {
      for (const plate in plates) {
        plates[plate].animation.kill();
        delete plates[plate].animation;
      }
      unsubActivePlate();
    };
  }, [island]);

  return null;
};

export { ProjectPlates };
