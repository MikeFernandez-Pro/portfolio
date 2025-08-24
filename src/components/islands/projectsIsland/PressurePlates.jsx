import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { Howl } from 'howler';

import { useStore } from '#store/ZustandStorage.jsx';

import PressurePlateAudio from '#assets/sounds/pressure-plate.mp3';

const PLATE_EMISSIVE_COLOR = new THREE.Color('#68CFF2');
const PLATE_EMISSIVE_INTENSITY = 0;

const createPlateAnimation = (plate, pressurePlateSoundEffect) =>
  gsap.to(plate.material, {
    duration: 0.2,
    emissiveIntensity: 3,
    paused: true,
    onStart: () => {
      pressurePlateSoundEffect.seek(0);
      pressurePlateSoundEffect.play();
    },
  });

const PressurePlates = props => {
  const { island } = props;

  const pressurePlateSoundEffect = useMemo(
    () =>
      new Howl({
        src: [PressurePlateAudio],
        autoplay: false,
        volume: 0.09,
      }),
    []
  );

  useEffect(() => {
    const plates = {
      seaPlate: {
        mesh: island.scene.getObjectByName('island_12'),
      },
      halloweenPlate: {
        mesh: island.scene.getObjectByName('island_13'),
      },
      portalPlate: {
        mesh: island.scene.getObjectByName('island_14'),
      },
    };

    for (const plate in plates) {
      if (plates[plate].mesh) {
        plates[plate].mesh.material.emissive = PLATE_EMISSIVE_COLOR;
        plates[plate].mesh.material.emissiveIntensity =
          PLATE_EMISSIVE_INTENSITY;

        plates[plate].animation = createPlateAnimation(
          plates[plate].mesh,
          pressurePlateSoundEffect
        );
      }
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

export { PressurePlates };
