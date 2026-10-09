import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/webgpu';
import { Howl } from 'howler';
import { useControls } from '#debug/useControls.jsx';
import { settingControls } from '#debug/settingControls.js';

import { DebugInspector } from './debug/DebugInspector.jsx';
import { PhysicsDebug } from './debug/PhysicsDebug.jsx';
import Joystick from '#character/Joystick.jsx';
import CharacterController from '#character/CharacterController.jsx';
import { DeathCycleControls } from '#character/deathCycle/DeathCycleControls.jsx';
import Stars from '#environment/Stars.jsx';
import Lights from '#environment/Lights.jsx';
import Clouds from '#environment/Clouds.jsx';
import { Sky } from '#environment/Sky.jsx';
import { CloudShadows } from '#environment/CloudShadows.jsx';
import { WindLines } from '#environment/WindLines.jsx';
import Islands from '#islands/Islands.jsx';
import TorchesSparks from '#islands/world/torches/TorchesSparks.jsx';
import { IslandCollider } from '#islands/world/IslandCollider.jsx';
import FireFlies from '#islands/world/lanterns/FireFlies.jsx';
import { Spiral } from '#islands/world/Spiral.jsx';
import { InteractiveElements } from '#islands/interaction/InteractiveElements.jsx';
import { subscribeWhenSet, useStore } from '#store';
import { DEBUG_ENABLED } from '#debug/debugEnabled.js';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';
import runningSoundEffect from '#character/runningSound.js';

import AmbientSoundEffectWebm from '#assets/sounds/ambient.webm';
import AmbientSoundEffect from '#assets/sounds/ambient.mp3';

const ambientSound = new Howl({
  // Music by Aleksey Chistilin
  // https://pixabay.com/fr/users/lexin_music-28841948/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=116199
  // Opus first (30% smaller); Howler falls back to the mp3 where webm/opus
  // isn't supported (older iOS Safari)
  src: [AmbientSoundEffectWebm, AmbientSoundEffect],
  autoplay: false,
  loop: true,
  volume: SOUND_VOLUMES.ambient,
});

const Experience = () => {
  const camera = useThree(state => state.camera);
  const gameplayCameraRotationRef = useRef(null);

  const { freeCamera } = useControls('Camera', {
    // Full free-fly OrbitControls; the third-person follow pauses while on
    freeCamera: false,
  });

  // Looping sounds get their volume applied live; one-shots (glyph,
  // project plate) and the distance-attenuated ones (portal, hammer) read
  // SOUND_VOLUMES on their next play / character move
  const loopingSounds = { ambient: ambientSound, running: runningSoundEffect };
  const volume = settingControls(SOUND_VOLUMES, (key, value) =>
    loopingSounds[key]?.volume(value)
  );
  useControls('Sounds', {
    ambient: volume('ambient', 0, 1, 0.01),
    running: volume('running', 0, 1, 0.01),
    skillsGlyph: volume('skillsGlyph', 0, 1, 0.01),
    projectPlate: volume('projectPlate', 0, 1, 0.01),
    portal: volume('portal', 0, 1, 0.01),
    hammer: volume('hammer', 0, 1, 0.01),
  });

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
    const unsubExperienceStarted = subscribeWhenSet(
      state => state.experienceStarted,
      () => {
        ambientSound.play();
        ambientSound.fade(0, SOUND_VOLUMES.ambient, 2000);
      }
    );

    return () => {
      unsubExperienceStarted();
    };
  }, []);

  return (
    <>
      {freeCamera && <OrbitControls />}
      {DEBUG_ENABLED && <DebugInspector />}
      {DEBUG_ENABLED && <PhysicsDebug />}
      {DEBUG_ENABLED && <DeathCycleControls />}
      <Joystick />
      <Clouds />
      <Stars />
      <Lights />
      <CloudShadows />
      <WindLines />
      <FireFlies />
      <TorchesSparks />
      <Spiral />
      <Islands />
      <Sky />
      {/* Custom capsule-vs-BVH physics (src/physics): these register the
          island collider, the sensor zones and the character body; the
          world steps from a useFrame inside CharacterController */}
      <IslandCollider />
      <CharacterController />
      <InteractiveElements />
    </>
  );
};

export default Experience;
