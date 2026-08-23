import { useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { CapsuleCollider, RigidBody } from '@react-three/rapier';
import gsap from 'gsap';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';
import { IS_MOBILE_DEVICE } from '#utils/utils.js';
import { useControls } from '#utils/useControls.jsx';

import CharacterModel from '#assets/models/character/character.glb';
import FallingAnimation from '#assets/animations/Falling.glb';
import runningSoundEffect from '#controller/audio/runningSound.js';

import { directionOffset } from '#controller/CharacterControllerUtils.js';

import { useCharacterMaterial } from '#controller/useCharacterMaterial.js';
import { useLanternAttachment } from '#controller/useLanternAttachment.js';
import { useHeadOrb } from '#controller/useHeadOrb.js';
import { playRespawnAnimation } from '#controller/respawnAnimation.js';
import { useKeyboardControls } from '#controller/hooks/useKeyboardControls.js';
import { useThirdPersonCamera } from '#controller/hooks/useThirdPersonCamera.js';
import {
  DeathParticles,
  playDeathParticles,
} from '#controller/DeathParticles.jsx';
import { playDespawnAnimation } from '#controller/despawnAnimation.js';
import { useCharacterAnimation } from '#controller/hooks/useCharacterAnimation.js';
import { updateMovement } from '#controller/movement/updateMovement.js';
import SensorCollider from '#controller/SensorCollider.jsx';
import FallingZoneSensor from '#controller/FallingZoneSensor.jsx';
import {
  BODY_TYPE_DYNAMIC as DYNAMIC,
  BODY_TYPE_FIXED as FIXED,
  ANIMATION_IDLE as IDLE,
  ANIMATION_RUN as RUN,
  ANIMATION_SPRINT as SPRINT,
  ANIMATION_JUMP as JUMP,
  ANIMATION_FALLING as FALLING,
  DEFAULT_CHARACTER_SPEED,
  DEFAULT_CHARACTER_SPRINT_SPEED,
} from '#controller/constants.js';

// Character defaults
let characterSpeed = DEFAULT_CHARACTER_SPEED;
let characterSprintSpeed = DEFAULT_CHARACTER_SPRINT_SPEED;
let canJump = false;
let currentAnimation = IDLE;
let characterIsMoving = false;
let characterJumping = false;
// Set by the falling-zone sensor: the character fell off the world and plays
// the falling animation until the death sequence hands back to idle
let characterFalling = false;
let characterSprinting = false;
let characterRespawning = false;
let groundedTime = 0;
let deathTimeline = null;

// Body pitch during the falling animation. The clip's hips rotation track is
// stripped (it made the character dive) and replaced with a single static
// keyframe: hips rest pose pitched by this angle. Baked into the clip data so
// the mixer crossfade blends the lean in with the rest of the pose instead of
// the whole mesh snapping to it
const DEFAULT_FALLING_BODY_ANGLE = 56;
let fallingBodyAngle = (DEFAULT_FALLING_BODY_ANGLE * Math.PI) / 180;

const PITCH_AXIS = new THREE.Vector3(1, 0, 0);

// Write the pitched hips pose into the falling clip's hips keyframe. `chain`
// maps the pitch (expressed in character space, like the old mesh tilt) into
// the hips' parent space; live-updating the track values is picked up by the
// mixer on the next frame
const bakeFallingBodyAngle = ({ track, rest, chain }) => {
  const pitch = new THREE.Quaternion().setFromAxisAngle(
    PITCH_AXIS,
    fallingBodyAngle
  );
  const q = chain
    .clone()
    .invert()
    .multiply(pitch)
    .multiply(chain)
    .multiply(rest);
  track.values.set([q.x, q.y, q.z, q.w]);
};
// Debug preview (Tweakpane): suspends the controller loop so the falling
// animation can be watched and tuned in place
let fallingPreviewActive = false;

// Seconds of ~zero vertical velocity before the grounded fallback re-enables
// jumping (was 3 frames at 60fps)
const GROUNDED_TIME_THRESHOLD = 0.05;

// Fallback kill height: the death-zone sensor is the primary death trigger;
// dropping below this despawns the character even if the sensor
// intersection was missed
const DEATH_HEIGHT = -3;

// Death sequence timing (seconds from the death). Character despawn and dust
// burst fire the instant the character dies; then the character teleports to
// spawn and the respawn dissolve reforms it.
const DEATH_TELEPORT_AT = 0.9;
const DEATH_RESPAWN_AT = DEATH_TELEPORT_AT + 0.6;

// running sound is managed in #controller/audio/runningSound.js

const CharacterController = () => {
  // Mobile
  const joystickAngleRef = useRef(useStore.getState().joystickAngle);

  const characterBody = useRef();
  const characterMesh = useRef();

  const { scene, animations } = useGLTF(CharacterModel);

  // Falling animation lives in a separate animation-only GLB (Blender export
  // of the Mixamo clip). Same rig (mixamorig:*) as the character, but the
  // clip carries translation/scale tracks on every bone and animates bones
  // the character rig doesn't have — keep only the rotation tracks of bones
  // that exist so the clip drops cleanly onto the character. The hips
  // rotation is dropped too (it pitches the body into a dive) and replaced
  // with a static rest-pose keyframe leaned by fallingBodyAngle.
  const fallingGltf = useGLTF(FallingAnimation);
  const fallingHipsRef = useRef(null);
  const mergedAnimations = useMemo(() => {
    const clip = fallingGltf.animations[0].clone();
    clip.name = FALLING;
    const rigBones = new Set();
    scene.traverse(object => object.isBone && rigBones.add(object.name));
    // Note: the loaders sanitize node names ('mixamorig:Hips' becomes
    // 'mixamorigHips'), so runtime bone and track names have no colon
    clip.tracks = clip.tracks.filter(track => {
      const [boneName, property] = track.name.split('.');
      return (
        rigBones.has(boneName) &&
        property === 'quaternion' &&
        boneName !== 'mixamorigHips'
      );
    });

    // Rest pose captured before the mixer ever poses the rig, and the
    // rotation chain from the character root down to the hips' parent so the
    // pitch can be expressed in character space
    const hips = scene.getObjectByName('mixamorigHips');
    const rest = hips.quaternion.clone();
    const chain = new THREE.Quaternion();
    const ancestors = [];
    for (let node = hips.parent; node && node !== scene; node = node.parent) {
      ancestors.unshift(node);
    }
    ancestors.forEach(node => chain.multiply(node.quaternion));
    const track = new THREE.QuaternionKeyframeTrack(
      'mixamorigHips.quaternion',
      [0],
      [rest.x, rest.y, rest.z, rest.w]
    );
    fallingHipsRef.current = { track, rest, chain };
    bakeFallingBodyAngle(fallingHipsRef.current);
    clip.tracks.push(track);

    return [...animations, clip];
  }, [animations, fallingGltf, scene]);

  const characterAnimations = useAnimations(mergedAnimations, scene);
  const animation = useCharacterAnimation(characterAnimations);

  // Character material and respawn effect
  useCharacterMaterial(scene);

  // Belt lantern (attached to the hips bone, swings with movement)
  useLanternAttachment({ scene, characterBody, characterMesh });

  // Glowing orb inside the head
  useHeadOrb(scene);

  // Adapter: route to animation helper while keeping local state
  const updateCharacterAnimation = useCallback(
    newAnimation => {
      currentAnimation = newAnimation;
      switch (newAnimation) {
        case IDLE:
          animation.playIdle();
          break;
        case RUN:
          animation.playRun();
          break;
        case SPRINT:
          animation.playSprint();
          break;
        case JUMP:
          animation.playJump();
          break;
        case FALLING:
          animation.playFalling();
          break;
        default:
          break;
      }
    },
    [animation]
  );

  // Debug: play the falling animation in place and tune the body pitch
  // applied while it plays. The preview freezes the body and suspends the
  // controller loop so gameplay code doesn't override the animation
  useControls(
    'Falling',
    {
      bodyAngle: {
        value: DEFAULT_FALLING_BODY_ANGLE,
        min: -90,
        max: 90,
        step: 1,
        onChange: v => {
          fallingBodyAngle = (v * Math.PI) / 180;
          if (fallingHipsRef.current) {
            bakeFallingBodyAngle(fallingHipsRef.current);
          }
        },
      },
      playFalling: () => {
        fallingPreviewActive = true;
        runningSoundEffect.stop();
        characterBody.current.setBodyType(FIXED);
        updateCharacterAnimation(FALLING);
      },
      stopPreview: () => {
        fallingPreviewActive = false;
        characterBody.current.setBodyType(DYNAMIC);
        updateCharacterAnimation(IDLE);
      },
    },
    { collapsed: true }
  );

  // Full death sequence, fired by the death-zone sensor (or the fallback
  // DEATH_HEIGHT check): the character freezes and disintegrates mid-air in
  // the falling pose (formed -> voronoi lava -> gone, the respawn dissolve
  // reversed) while the dust burst rises from where it died; then the
  // character teleports to spawn and the respawn dissolve reforms it
  const killCharacter = useCallback(() => {
    if (characterRespawning) return;
    characterRespawning = true;
    runningSoundEffect.stop();
    characterBody.current.setBodyType(FIXED);
    characterJumping = false;
    characterSprinting = false;
    updateCharacterAnimation(FALLING);
    useStore.setState({ isCharacterMoving: false });
    playDespawnAnimation();
    playDeathParticles(characterBody.current.translation());

    const startRespawn = () =>
      playRespawnAnimation({
        onComplete: () => {
          characterRespawning = false;
          characterBody.current.setBodyType(DYNAMIC);
        },
      });

    deathTimeline?.kill();
    deathTimeline = gsap.timeline();
    // Teleport the character back to spawn while it's fully dissolved
    deathTimeline.call(
      () => {
        // Settled resting height (the body is held FIXED during the
        // respawn, so this must be the height it rests at, not the initial
        // pre-settle 0.7)
        characterBody.current.setTranslation({ x: 0, y: 0.62, z: 0 }, true);
        // Reset visual orientation to default
        if (characterMesh.current) {
          characterMesh.current.rotation.set(0, Math.PI, 0);
        }
        // Back on solid ground: reform in idle, not the falling pose
        characterFalling = false;
        updateCharacterAnimation(IDLE);
      },
      undefined,
      DEATH_TELEPORT_AT
    );
    deathTimeline.call(startRespawn, undefined, DEATH_RESPAWN_AT);
  }, [updateCharacterAnimation]);

  // Character jump event. Falling and respawning own the animation: no jump
  // until the character is back on its feet (the grounded fallback can
  // re-enable canJump while the body is held FIXED during the respawn)
  const characterJumpEvent = () => {
    if (!canJump || characterFalling || characterRespawning) return;
    characterJumping = true;
    canJump = false;
    groundedTime = 0;
    characterBody.current.applyImpulse({ x: 0, y: 1.2, z: 0 });
    updateCharacterAnimation(JUMP);
  };

  // Keyboard controls (desktop)
  const { eventKeys, resetKeys } = useKeyboardControls({
    onSpaceDown: () => {
      characterJumpEvent();
    },
    onShiftDown: () => {
      if (!characterIsMoving) return;
      characterSpeed = characterSprintSpeed;
      characterSprinting = true;
      // Falling / respawning own the animation; the sprint flag stays set so
      // the frame loop picks the sprint up on landing if shift is still held
      if (
        currentAnimation !== SPRINT &&
        !characterJumping &&
        !characterFalling &&
        !characterRespawning
      ) {
        updateCharacterAnimation(SPRINT);
        // Increase playback rate when sprinting
        runningSoundEffect.rate(1.5);
      }
    },
    onShiftUp: () => {
      // Revert sprint effect
      characterSprinting = false;
      characterSpeed = DEFAULT_CHARACTER_SPEED;
      // Restore running playback rate
      runningSoundEffect.rate(1.1);
    },
  });

  // Pause character physics and keystroke handling
  const pauseCharacter = useCallback(() => {
    resetKeys();
    characterBody.current.setBodyType(FIXED);
  }, [resetKeys]);

  // Current character direction and position
  let direction;
  let characterPosition;

  useFrame((state, delta) => {
    const dissolveUniforms = useStore.getState().characterRespawnUniforms;
    if (dissolveUniforms?.uTime) {
      dissolveUniforms.uTime.value = state.clock.elapsedTime;
    }

    // Debug falling preview: whole controller suspended while tweaking
    if (fallingPreviewActive) return;

    direction = directionOffset(eventKeys, characterBody);
    characterIsMoving = direction !== undefined ? true : false;

    if (
      characterIsMoving &&
      characterSprinting &&
      currentAnimation !== SPRINT &&
      !characterJumping &&
      !characterFalling &&
      !characterRespawning
    ) {
      updateCharacterAnimation(SPRINT);
    }

    characterPosition = characterBody.current.translation();

    // Grounded fallback: intersection events from the ground sensor can be
    // missed (thin trimesh + variable timestep), which leaves the jump
    // animation stuck and jumping disabled. A short stretch of ~zero
    // vertical velocity means we are standing on something again.
    if (!canJump || characterJumping) {
      if (Math.abs(characterBody.current.linvel().y) < 0.02) {
        groundedTime += delta;
        if (groundedTime >= GROUNDED_TIME_THRESHOLD) {
          canJump = true;
          characterJumping = false;
          characterFalling = false;
          useStore.setState({ characterGrounded: true });
        }
      } else {
        groundedTime = 0;
      }
    }

    // Primary death trigger is the death-zone sensor; this catches the
    // character if it slips past the sensor
    if (characterPosition.y < DEATH_HEIGHT && !characterRespawning) {
      killCharacter();
    }
    // Camera follow is managed by useThirdPersonCamera

    /**
     * Character Controller
     */
    // Block movement while respawning
    if (characterRespawning) {
      runningSoundEffect.stop();
      // The falling pose survives the dissolve; anything else resets to idle
      if (currentAnimation !== IDLE && currentAnimation !== FALLING) {
        updateCharacterAnimation(IDLE);
        useStore.setState({ isCharacterMoving: false });
      }
      characterBody.current.setLinvel(
        { x: 0, y: characterBody.current.linvel().y, z: 0 },
        true
      );
      return;
    }

    // Update character velocity and orientation
    if (
      (direction === undefined && !IS_MOBILE_DEVICE) ||
      (IS_MOBILE_DEVICE && joystickAngleRef.current === undefined)
    ) {
      runningSoundEffect.stop();
      if (currentAnimation !== IDLE && !characterJumping && !characterFalling) {
        updateCharacterAnimation(IDLE);

        useStore.setState({ isCharacterMoving: false });
      }

      characterBody.current.setLinvel(
        {
          x: 0,
          y: characterBody.current.linvel().y,
          z: 0,
        },
        true
      );
      return;
    }

    if (characterBody.current.bodyType() === FIXED)
      characterBody.current.setBodyType(DYNAMIC);

    if (
      currentAnimation !== RUN &&
      !characterJumping &&
      !characterSprinting &&
      !characterFalling
    ) {
      updateCharacterAnimation(RUN);
      useStore.setState({ isCharacterMoving: true });
      runningSoundEffect.play();
    }

    updateMovement({
      characterBody,
      characterMesh,
      direction,
      joystickAngle: joystickAngleRef.current,
      isMobileDevice: IS_MOBILE_DEVICE,
      characterSpeed,
      delta,
    });
  });

  useLayoutEffect(() => {
    if (!IS_MOBILE_DEVICE) {
      scene.traverse(object => {
        if (object.isMesh || object.isSkinnedMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
    }

    // JoyStick subscriber
    const unsubJoystickAngle = !IS_MOBILE_DEVICE
      ? undefined
      : useStore.subscribe(
          state => state.joystickAngle,
          joystickAngle => (joystickAngleRef.current = joystickAngle)
        );

    // Event Listeners
    if (!IS_MOBILE_DEVICE) {
      window.addEventListener('blur', pauseCharacter);
    }

    return () => {
      if (!IS_MOBILE_DEVICE) {
        window.removeEventListener('blur', pauseCharacter);
      }
      if (IS_MOBILE_DEVICE) unsubJoystickAngle();
    };
  }, []);

  // Initialize third-person camera behavior
  useThirdPersonCamera(characterBody);

  return (
    <>
      {/* Death disintegration burst (positioned + played by the death
          sequence above; outside the rigid body so the teleport to spawn
          never drags it along) */}
      <DeathParticles />
      <SensorCollider
        onEnter={state => {
          // Only the character should toggle the grounded state
          if (state.other.rigidBody !== characterBody.current) return;
          canJump = true;
          characterJumping = false;
          characterFalling = false;
          useStore.setState({ characterGrounded: true });
        }}
        onExit={state => {
          if (state.other.rigidBody !== characterBody.current) return;
          canJump = false;
          useStore.setState({ characterGrounded: false });
        }}
      />
      {/* Fell off the world: the falling animation plays the moment the
          character crosses the zone under the island edges, then the death
          zone below (or the DEATH_HEIGHT fallback) kills it */}
      <FallingZoneSensor
        onEnter={state => {
          if (state.other.rigidBody !== characterBody.current) return;
          if (characterRespawning || characterFalling) return;
          characterFalling = true;
          runningSoundEffect.stop();
          updateCharacterAnimation(FALLING);
          useStore.setState({ isCharacterMoving: false });
        }}
        onDeathEnter={state => {
          if (state.other.rigidBody !== characterBody.current) return;
          killCharacter();
        }}
      />
      <RigidBody
        type={'fixed'}
        lockRotations
        ref={characterBody}
        colliders={false}
        position-y={0.7}
        restitution={-10}
        friction={0}
      >
        {/* Visual-only y offset of the mesh inside the rigid body (the
            capsule collider and physics are untouched) */}
        <primitive
          ref={characterMesh}
          object={scene}
          scale={0.18}
          rotation-y={Math.PI}
          position-y={-0.02}
        />
        <CapsuleCollider args={[0.3, 0.25]} position={[0, 0.58, 0]} />
      </RigidBody>
    </>
  );
};

useGLTF.preload(CharacterModel);

export default CharacterController;
