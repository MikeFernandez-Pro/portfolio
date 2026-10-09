import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/webgpu';
import { Howl } from 'howler';
import { useControls } from '#debug/useControls.jsx';
import * as THREE from 'three';

import { DebugInspector } from './debug/DebugInspector.jsx';
import { PhysicsDebug } from './debug/PhysicsDebug.jsx';
import Joystick from '#character/Joystick.jsx';
import CharacterController from '#character/CharacterController.jsx';
import RespawnControls from '#character/deathCycle/RespawnControls.jsx';
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
import { Grass } from '#islands/resume/grass/Grass.jsx';
import BonfireSmoke from '#islands/resume/BonfireSmoke.jsx';
import { useStore } from '#store';
import { DEBUG_ENABLED } from '#debug/debugEnabled.js';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';
import runningSoundEffect from '#character/runningSound.js';

import AmbientSoundEffectWebm from '#assets/sounds/ambient.webm';
import AmbientSoundEffect from '#assets/sounds/ambient.mp3';

var ambientSound = new Howl({
  // Music by Aleksey Chistilin
  // https://pixabay.com/fr/users/lexin_music-28841948/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=116199
  // Opus first (30% smaller); Howler falls back to the mp3 where webm/opus
  // isn't supported (older iOS Safari)
  src: [AmbientSoundEffectWebm, AmbientSoundEffect],
  autoplay: false,
  loop: true,
  volume: SOUND_VOLUMES.ambient,
});

// Width of the sky gradient's bottom→top blend band, in sphere V units —
// 0.65 is the original hardcoded 0.35→1 stops
const SKY_MIX_BAND = 0.65;

const Experience = () => {
  const camera = useThree(state => state.camera);
  const gameplayCameraRotationRef = useRef(null);

  const controls = useControls('Background', {
    bottomColor: '#000649',
    topColor: '#0077ff',
    // 0 = the whole sky is bottomColor, 1 = all topColor; in between the
    // blend band slides proportionally
    mixHeight: { value: 0.3, min: 0, max: 1, step: 0.01 },
  });

  // The gradient's blend band (fixed width) slides with mixHeight, past the
  // zenith at 0 (bottomColor fills the sphere) and past the horizon at 1
  // (topColor fills it), so the extremes really reach 100% of one color
  const skyMixCenter =
    (1 - controls.mixHeight) * (1 + SKY_MIX_BAND) - SKY_MIX_BAND / 2;
  const skyStops = [
    THREE.MathUtils.clamp(skyMixCenter - SKY_MIX_BAND / 2, 0, 1),
    THREE.MathUtils.clamp(skyMixCenter + SKY_MIX_BAND / 2, 0, 1),
  ];

  const { freeCamera } = useControls('Camera', {
    // Full free-fly OrbitControls; the third-person follow pauses while on
    freeCamera: false,
  });

  useControls('Sounds', {
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
      {freeCamera && <OrbitControls />}
      {DEBUG_ENABLED && <DebugInspector />}
      {DEBUG_ENABLED && <PhysicsDebug />}
      {/* Stays mounted with debug off: its initial onChange calls set up the
          respawn/spiral shader uniforms the real death animation uses; the
          headless useControls renders no UI for it */}
      <RespawnControls />
      <Joystick />
      <Clouds />
      <Stars />
      <Lights />
      <CloudShadows />
      <WindLines />
      <FireFlies />
      <BonfireSmoke />
      <TorchesSparks />
      <Grass />
      <Spiral />
      <Islands />
      <Sky
        stops={skyStops}
        colors={[controls.bottomColor, controls.topColor]}
      />
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
