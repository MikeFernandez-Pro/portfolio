import { useEffect } from "react";
import { Physics } from "@react-three/rapier";
import { useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Howl } from "howler";
import { useStore } from "./ZustandStorage.jsx";

import Joystick from "./Joystick.jsx";
import Island from "./Island.jsx";
import IslandColliders from "./IslandColliders.jsx";
import SampledGrass from "./SampledGrass.jsx";
import CharacterController from "./CharacterController.jsx";
import ProjectsPortals from "./ProjectsPortals.jsx";
import Clouds from "./Clouds.jsx";
import Smoke from "./Smoke.jsx";
import Lights from "./Lights.jsx";
import TorchesSparks from "./TorchSparks/TorchesSparks.jsx";
import FireFlies from "./FireFlies.jsx";
import Sky from "./Sky.jsx";
import { Perf } from "r3f-perf";
import { Grass } from "./grass/Grass.tsx";
import { OrbitControls } from "@react-three/drei";

var ambientSound = new Howl({
  // Music by Aleksey Chistilin
  // https://pixabay.com/fr/users/lexin_music-28841948/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=116199
  src: ["sounds/ambientMusic.mp3"],
  autoplay: false,
  loop: true,
  volume: 0.09,
});

const Experience = () => {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const unsubExperienceStarted = useStore.subscribe(
      (state) => state.experienceStarted,
      (experienceStarted) => {
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
      <OrbitControls />
      <Perf position="top-left" />
      <Joystick />
      {/* <Clouds /> */}
      <Sky />
      <Lights />
      <SampledGrass />
      <FireFlies />
      <Smoke />
      <TorchesSparks />
      <ProjectsPortals />
      <Grass />
      <Island />
      <Physics timeStep="vary" gravity={[0, -29.43, 0]}>
        <IslandColliders />
        <CharacterController />
      </Physics>
    </>
  );
};

export default Experience;
