import { useEffect } from 'react';
import { Physics } from '@react-three/rapier';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Howl } from 'howler';
import { useStore } from '#store/ZustandStorage.jsx';

import Joystick from '#controller/Joystick.jsx';
import Islands from '#islands/Islands.jsx';
import CharacterController from '#controller/CharacterController.jsx';
import ProjectsPortals from '#islands/projectsIsland/ProjectsPortals.jsx';
import Clouds from '#environment/Clouds.jsx';
import Smoke from '#islands/resumeIsland/Smoke.jsx';
import Lights from '#environment/Lights.jsx';
import TorchesSparks from '#islands/common/torchSparks/TorchesSparks.jsx';
import FireFlies from '#islands/common/FireFlies.jsx';
import Sky from '#environment/Sky.jsx';
import { Perf } from 'r3f-perf';
import { Grass } from '#islands/resumeIsland/grass/Grass.jsx';
import { GradientTexture } from '@react-three/drei';
import { useControls } from 'leva';
import { InteractiveElements } from '#islands/contactIsland/interactiveElements/InteractiveElements.jsx';
import { IslandCollider } from '#islands/common/IslandCollider.jsx';
import { OrbitControls } from '@react-three/drei';

var ambientSound = new Howl({
  // Music by Aleksey Chistilin
  // https://pixabay.com/fr/users/lexin_music-28841948/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=116199
  src: ['sounds/ambientMusic.mp3'],
  autoplay: false,
  loop: true,
  volume: 0.09,
});

const Experience = () => {
  const scene = useThree(state => state.scene);

  const controls = useControls({
    bottomColor: '#203e71',
    topColor: '#d998fd',
  });

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
      <Perf position="top-left" />
      <Joystick />
      {/* <Clouds /> */}
      <Sky />
      <Lights />
      <FireFlies />
      <Smoke />
      <TorchesSparks />
      <ProjectsPortals />
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
