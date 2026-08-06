import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { GradientTexture, OrbitControls, StatsGl } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Howl } from 'howler';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three';

import Joystick from '#controller/Joystick.jsx';
import CharacterController from '#controller/CharacterController.jsx';
import Sky from '#environment/Sky.jsx';
import Lights from '#environment/Lights.jsx';
import Clouds from '#environment/Clouds.jsx';
import { CloudShadows } from '#environment/CloudShadows.jsx';
import { WindLines } from '#environment/WindLines.jsx';
import Islands from '#islands/Islands.jsx';
import TorchesSparks from '#islands/common/torchSparks/TorchesSparks.jsx';
import { IslandCollider } from '#islands/common/IslandCollider.jsx';
import FireFlies from '#islands/common/FireFlies.jsx';
import { InteractiveElements } from '#islands/contactIsland/interactiveElements/InteractiveElements.jsx';
import { Grass } from '#islands/resumeIsland/grass/Grass.jsx';
import Smoke from '#islands/resumeIsland/Smoke.jsx';
import { useStore } from '#store/ZustandStorage.jsx';

import AmbientSoundEffect from '#assets/sounds/ambient.mp3';

var ambientSound = new Howl({
  // Music by Aleksey Chistilin
  // https://pixabay.com/fr/users/lexin_music-28841948/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=116199
  src: [AmbientSoundEffect],
  autoplay: false,
  loop: true,
  volume: 0.09,
});

const Experience = () => {
  const scene = useThree(state => state.scene);

  const controls = useControls(
    'Background',
    {
      bottomColor: '#203e71',
      topColor: '#d998fd',
    },
    { collapsed: true }
  );

  useEffect(() => {
    const unsubExperienceStarted = useStore.subscribe(
      state => state.experienceStarted,
      experienceStarted => {
        if (experienceStarted) {
          ambientSound.play();
          ambientSound.fade(0, 0.09, 2000);
        }
      }
    );

    return () => {
      unsubExperienceStarted();
    };
  }, []);

  return (
    <>
      {/* <OrbitControls /> */}
      <StatsGl />
      <Joystick />
      {/* <Clouds /> */}
      <Sky />
      <Lights />
      <CloudShadows />
      <WindLines />
      <FireFlies />
      <Smoke />
      <TorchesSparks />
      <Grass />
      <Islands />
      <mesh>
        <sphereGeometry args={[125]} />
        <meshBasicMaterial side={THREE.BackSide}>
          <GradientTexture
            stops={[0.35, 1]}
            colors={[controls.bottomColor, controls.topColor]}
            size={1024}
          />
        </meshBasicMaterial>
      </mesh>
      <Physics timeStep="vary" gravity={[0, -29.43, 0]}>
        <IslandCollider />
        <CharacterController />
        <InteractiveElements />
      </Physics>
    </>
  );
};

export default Experience;
