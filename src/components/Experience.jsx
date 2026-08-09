import { useEffect, useRef } from 'react';
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
import { IS_PHOTO_MODE } from '#utils/utils.js';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';
import runningSoundEffect from '#controller/audio/runningSound.js';

import AmbientSoundEffect from '#assets/sounds/ambient.mp3';

var ambientSound = new Howl({
  // Music by Aleksey Chistilin
  // https://pixabay.com/fr/users/lexin_music-28841948/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=116199
  src: [AmbientSoundEffect],
  autoplay: false,
  loop: true,
  volume: SOUND_VOLUMES.ambient,
});

const Experience = () => {
  const scene = useThree(state => state.scene);
  const camera = useThree(state => state.camera);
  const gameplayCameraRotationRef = useRef(null);

  const controls = useControls(
    'Background',
    {
      bottomColor: '#203e71',
      topColor: '#d998fd',
    },
    { collapsed: true }
  );

  const { freeCamera } = useControls(
    'Camera',
    {
      // Full free-fly OrbitControls; the third-person follow pauses while on
      freeCamera: IS_PHOTO_MODE,
    },
    { collapsed: true }
  );

  useControls(
    'Sounds',
    {
      // Looping sounds get their volume applied live; one-shots (glyph,
      // pressure plate) and the distance-attenuated ones (portal, hammer)
      // read SOUND_VOLUMES on their next play / character move
      ambient: {
        value: SOUND_VOLUMES.ambient,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          SOUND_VOLUMES.ambient = value;
          ambientSound.volume(value);
        },
      },
      running: {
        value: SOUND_VOLUMES.running,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          SOUND_VOLUMES.running = value;
          runningSoundEffect.volume(value);
        },
      },
      magicGlyph: {
        value: SOUND_VOLUMES.magicGlyph,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          SOUND_VOLUMES.magicGlyph = value;
        },
      },
      pressurePlate: {
        value: SOUND_VOLUMES.pressurePlate,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          SOUND_VOLUMES.pressurePlate = value;
        },
      },
      portal: {
        value: SOUND_VOLUMES.portal,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          SOUND_VOLUMES.portal = value;
        },
      },
      hammer: {
        value: SOUND_VOLUMES.hammer,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          SOUND_VOLUMES.hammer = value;
        },
      },
    },
    { collapsed: true }
  );

  useEffect(() => {
    useStore.setState({ freeCameraActive: freeCamera });

    // OrbitControls rotates the camera; the follow only drives its position,
    // so the gameplay orientation must be saved and restored around free mode
    if (freeCamera) {
      gameplayCameraRotationRef.current = camera.rotation.clone();
    } else if (gameplayCameraRotationRef.current) {
      camera.rotation.copy(gameplayCameraRotationRef.current);
      gameplayCameraRotationRef.current = null;
    }
  }, [freeCamera, camera]);

  useEffect(() => {
    const unsubExperienceStarted = useStore.subscribe(
      state => state.experienceStarted,
      experienceStarted => {
        if (experienceStarted) {
          ambientSound.play();
          ambientSound.fade(0, SOUND_VOLUMES.ambient, 2000);
        }
      }
    );

    return () => {
      unsubExperienceStarted();
    };
  }, []);

  return (
    <>
      {freeCamera && (
        // In photo mode orbit around the islands instead of the world origin
        <OrbitControls target={IS_PHOTO_MODE ? [-1.35, 5, -15] : undefined} />
      )}
      {!IS_PHOTO_MODE && <StatsGl />}
      {!IS_PHOTO_MODE && <Joystick />}
      <Clouds />
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
