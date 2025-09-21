import {
  useRef,
  useMemo,
  useCallback,
  useLayoutEffect,
  useEffect,
} from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, useTexture } from '@react-three/drei';
import { CapsuleCollider, RigidBody } from '@react-three/rapier';
import { Howl } from 'howler';
import gsap from 'gsap';
import { useControls } from 'leva';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';
import { IS_MOBILE_DEVICE } from '#utils/utils.js';

import CustomShaderMaterial from 'three-custom-shader-material/vanilla';

import CharacterModel from '#assets/models/character/character.glb';
import IslandSensorsModel from '#assets/models/islandSensors/islandSensors.glb';
import RunningSoundEffect from '#assets/sounds/running.mp3';

import voronoiImage from '#assets/textures/voronoi.jpg';
import vertexShader from '#shaders/character/vertex.glsl';
import fragmentShader from '#shaders/character/fragment.glsl';

const directionOffset = (
  { forward, backward, leftward, rightward },
  characterBody
) => {
  if (!forward && !backward && !leftward && !rightward) return undefined;

  if (characterBody.current.isSleeping()) {
    characterBody.current.wakeUp();
  }

  if (forward && leftward) return (7 * Math.PI) / 4;
  if (forward && rightward) return (5 * Math.PI) / 4;
  if (backward && leftward) return Math.PI / 4;
  if (backward && rightward) return (3 * Math.PI) / 4;
  if (backward) return Math.PI / 2;
  if (leftward) return 0;
  if (rightward) return -Math.PI;

  return -Math.PI / 2;
};

/*
 *  Character
 */
// body type
const DYNAMIC = 0;
const FIXED = 1;

// animations
const IDLE = 'Idle';
const RUN = 'Run';
const SPRINT = 'Sprint';
const JUMP = 'JumpRunning';

// default configuration
let characterSpeed = 4;
let canJump = false;
let currentAnimation = IDLE;
let characterIsMoving = false;
let characterJumping = false;
let characterSprinting = false;

const boundsMin = new THREE.Vector3(-3.34, 0, -2.41);
const boundsMax = new THREE.Vector3(3.34, 5.94, 0.73);

let runningSoundEffect = new Howl({
  src: [RunningSoundEffect],
  autoplay: false,
  loop: true,
  volume: 0.4,
  rate: 1.1,
});

/*
 *  Controller
 */
const ROTATION_EULER = new THREE.Vector3(0, 1, 0);
const ROTATION_QUATERNION = new THREE.Quaternion();
let controllerActivated = false;

/*
 *  Camera
 */
const CAMERA_POSITION = new THREE.Vector3(0, 0, 0);
const LERP_CAMERA_POSITION = new THREE.Vector3(
  0,
  5.2,
  IS_MOBILE_DEVICE ? 7.5 : 5.5
);
// const CAMERA_OFFSET = new THREE.Vector3(0, 4, MOBILE_DEVICE ? 7.5 : 5.5);
let CAMERA_OFFSET = new THREE.Vector3(-3.5, 17.4, 29.6);

/*
 *  Keystrokes
 */
const keysConfigList = {
  ArrowUp: 'forward',
  ArrowDown: 'backward',
  ArrowLeft: 'leftward',
  ArrowRight: 'rightward',
  KeyW: 'forward',
  KeyS: 'backward',
  KeyA: 'leftward',
  KeyD: 'rightward',
};

const eventKeys = {
  forward: false,
  backward: false,
  leftward: false,
  rightward: false,
  enter: false,
};

const CharacterController = () => {
  // Mobile
  const joystickAngleRef = useRef(useStore.getState().joystickAngle);

  /**
   * Character
   */
  const characterBody = useRef();
  const characterMesh = useRef();

  // Character Model and animations loaders
  const { scene, animations } = useMemo(() => useGLTF(CharacterModel), []);
  const characterAnimations = useAnimations(animations, scene);

  const updateCharacterAnimation = useCallback(newAnimation => {
    characterAnimations.actions[currentAnimation].fadeOut(0.2);
    currentAnimation = newAnimation;
    characterAnimations.actions[currentAnimation].reset().fadeIn(0.2).play();
  }, []);

  const characterJumpEvent = () => {
    if (canJump) {
      characterJumping = true;
      characterBody.current.applyImpulse({ x: 0, y: 1.2, z: 0 });
      updateCharacterAnimation(JUMP);
    }
  };

  const keyboardEventHandler = event => {
    event.preventDefault();
    if (keysConfigList[event.code]) {
      eventKeys[keysConfigList[event.code]] =
        event.type === 'keydown' ? true : false;
    }

    if (event.code === 'Space' && event.type === 'keydown') {
      characterJumpEvent();
    }
    if (
      ((event.code === 'ShiftLeft' && event.type === 'keydown') ||
        event.shiftKey) &&
      !characterIsMoving
    )
      return;
    characterSpeed =
      (event.code === 'ShiftLeft' && event.type === 'keydown') || event.shiftKey
        ? 6
        : 4;
    characterSprinting =
      (event.code === 'ShiftLeft' && event.type === 'keydown') || event.shiftKey
        ? true
        : false;
    if (
      ((event.code === 'ShiftLeft' && event.type === 'keydown') ||
        event.shiftKey) &&
      currentAnimation !== SPRINT &&
      !characterJumping
    ) {
      updateCharacterAnimation(SPRINT);
      runningSoundEffect.stop();
      runningSoundEffect.play();
      runningSoundEffect.rate(1.5);
    }
    if (event.code === 'ShiftLeft' && event.type === 'keyup') {
      runningSoundEffect.stop();
      runningSoundEffect.play();
      runningSoundEffect.rate(1.1);
    }
  };

  // Pause character physics and keystroke handling
  const pauseCharacter = useCallback(() => {
    for (const key in eventKeys) eventKeys[key] = false;
    characterBody.current.setBodyType(FIXED);
  }, []);

  const cameraOffsetOnMouseMove = useCallback(event => {
    CAMERA_OFFSET.x = ((event.clientX / window.innerWidth) * 2 - 1) * 0.5;
  }, []);

  // Current character direction and position
  let direction;
  let characterPosition;

  const { nodes } = useMemo(() => useGLTF(IslandSensorsModel), []);
  nodes.Sensor.material.visible = false;

  const voronoiTexture = useTexture(voronoiImage, texture => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.NoColorSpace;
  });

  const characterControls = useControls(
    'Character',
    {
      color: { value: '#ff6500' },
      intensity: { value: 39.0, min: 0, max: 100 },
      repeat: { value: 3.2, min: 0, max: 10 },
      progress: { value: 0.0, min: 0, max: 1 },
      smoothStepBegin: { value: 0.0, min: 0, max: 1 },
      smoothStepEnd: { value: 1.0, min: 0, max: 1 },
      respawn: { value: 0.0, min: 0, max: 1 },
    },
    { collapsed: true }
  );

  const customMaterialRef = useRef();

  useEffect(() => {
    let characterMaterial = scene.getObjectByName('knight')?.material;

    window.addEventListener('keydown', e => {
      if (e.key === 'p') {
        gsap.fromTo(
          characterControls,
          { progress: 0 },
          {
            progress: 1,
            duration: 1.5,
            ease: 'power2.in',
            onStart: () => {
              characterControls.respawn = 0;
            },
            onComplete: () => {
              gsap.to(characterControls, {
                respawn: 1,
                duration: 0.5,
                ease: 'power2.out',
              });
            },
          }
        );
      }
    });

    customMaterialRef.current = new CustomShaderMaterial({
      baseMaterial: characterMaterial,
      uniforms: {
        uVoronoiTexture: { value: voronoiTexture },
        uBoundsMin: { value: boundsMin },
        uBoundsMax: { value: boundsMax },
        uColor: {
          value: new THREE.Color(characterControls.color),
        },
        uIntensity: {
          value: characterControls.intensity,
        },
        uRepeat: {
          value: characterControls.repeat,
        }, // tiling
        uProgress: {
          value: characterControls.progress,
        },
        uSmoothStepBegin: {
          value: characterControls.smoothStepBegin,
        },
        uSmoothStepEnd: {
          value: characterControls.smoothStepEnd,
        },
        uRespawn: {
          value: characterControls.respawn,
        },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      tonemapped: false,
      side: THREE.DoubleSide,
    });

    scene.traverse(child => {
      if (child.isMesh) child.material = customMaterialRef.current;
    });
  }, []);

  useFrame(() => {
    if (customMaterialRef.current) {
      customMaterialRef.current.uniforms.uColor.value = new THREE.Color(
        characterControls.color
      );
      customMaterialRef.current.uniforms.uIntensity.value =
        characterControls.intensity;
      customMaterialRef.current.uniforms.uRepeat.value =
        characterControls.repeat;
      customMaterialRef.current.uniforms.uProgress.value =
        characterControls.progress;
      customMaterialRef.current.uniforms.uSmoothStepBegin.value =
        characterControls.smoothStepBegin;
      customMaterialRef.current.uniforms.uSmoothStepEnd.value =
        characterControls.smoothStepEnd;
      customMaterialRef.current.uniforms.uRespawn.value =
        characterControls.respawn;
    }
  });

  useFrame((state, delta) => {
    /**
     * Camera Controller
     */
    direction = directionOffset(eventKeys, characterBody);
    characterIsMoving = direction !== undefined ? true : false;

    if (
      characterIsMoving &&
      characterSprinting &&
      currentAnimation !== SPRINT &&
      !characterJumping
    ) {
      characterAnimations.actions[currentAnimation].fadeOut(0.2);
      currentAnimation = SPRINT;
      characterAnimations.actions[currentAnimation].reset().fadeIn(0.2).play();
    }

    characterPosition = characterBody.current.translation();

    if (characterPosition.y < 0) {
      characterBody.current.setTranslation({
        x: 0,
        y: 1.5,
        z: 0,
      });
    }
    /*
     * Camera Controller
     */
    useStore.setState({ characterPosition: characterPosition });

    // CAMERA_POSITION.addVectors(characterPosition, CAMERA_OFFSET);
    // LERP_CAMERA_POSITION.lerp(CAMERA_POSITION, 5 * delta);
    // state.camera.position.set(...LERP_CAMERA_POSITION);

    /**
     * Character Controller
     */
    // Update character velocity and orientation
    if (
      (direction === undefined && !IS_MOBILE_DEVICE) ||
      (IS_MOBILE_DEVICE && joystickAngleRef.current === undefined)
    ) {
      runningSoundEffect.stop();
      if (currentAnimation !== IDLE && !characterJumping) {
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

    if (currentAnimation !== RUN && !characterJumping && !characterSprinting) {
      updateCharacterAnimation(RUN);
      useStore.setState({ isCharacterMoving: true });
      runningSoundEffect.play();
    }

    characterBody.current.setLinvel(
      {
        x:
          characterSpeed *
          Math.cos(IS_MOBILE_DEVICE ? joystickAngleRef.current : direction) *
          (IS_MOBILE_DEVICE ? 1 : -1),
        y: characterBody.current.linvel().y,
        z:
          characterSpeed *
          Math.sin(IS_MOBILE_DEVICE ? joystickAngleRef.current : direction) *
          (IS_MOBILE_DEVICE ? -1 : 1),
      },
      true
    );

    ROTATION_QUATERNION.setFromAxisAngle(
      ROTATION_EULER,
      IS_MOBILE_DEVICE
        ? joystickAngleRef.current + Math.PI / 2
        : direction - Math.PI / 2
    );
    characterMesh.current.quaternion.rotateTowards(
      ROTATION_QUATERNION,
      15 * delta
    );
  });

  const camera = useThree(state => state.camera);

  useLayoutEffect(() => {
    // Shadows initialization
    if (!IS_MOBILE_DEVICE) {
      const mesh = scene.getObjectByName('knight');
      mesh.castShadow = true;
    }

    // Set character default animation
    characterAnimations.actions[IDLE].fadeIn(0.2).play();

    // Jump animation configuration
    characterAnimations.actions[JUMP].loop = THREE.LoopOnce;
    characterAnimations.actions[JUMP].clampWhenFinished = true;

    /**
     * Subscribers
     */

    const unsubExperienceStarted = useStore.subscribe(
      state => state.experienceStarted,
      experienceStarted => {
        if (experienceStarted) {
          // Set camera default position
          gsap.to(CAMERA_OFFSET, {
            duration: 5,
            x: 0,
            y: 4,
            z: IS_MOBILE_DEVICE ? 7.5 : 5.5,
            ease: 'power3.out',
            onComplete: () => (controllerActivated = true),
          });
        }
      }
    );

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
      document.addEventListener('keydown', keyboardEventHandler);
      document.addEventListener('keyup', keyboardEventHandler);
      window.addEventListener('mousemove', cameraOffsetOnMouseMove);
    }

    return () => {
      unsubExperienceStarted();
      if (!IS_MOBILE_DEVICE) {
        window.removeEventListener('blur', pauseCharacter);
        document.removeEventListener('keydown', keyboardEventHandler);
        document.removeEventListener('keyup', keyboardEventHandler);
        window.removeEventListener('mousemove', cameraOffsetOnMouseMove);
      }
      if (IS_MOBILE_DEVICE) unsubJoystickAngle();
    };
  }, []);

  return (
    <>
      <RigidBody
        type={'fixed'}
        colliders={'trimesh'}
        sensor
        onIntersectionEnter={state => {
          canJump = true;
          characterJumping = false;
        }}
        onIntersectionExit={state => (canJump = false)}
      >
        <mesh
          scale={0.45}
          position={[-1.35, 2.4, -15]}
          geometry={nodes.Sensor.geometry}
          material={nodes.Sensor.material}
        />
      </RigidBody>
      <RigidBody
        type={'fixed'}
        lockRotations
        ref={characterBody}
        colliders={false}
        position-y={0.7}
        restitution={-10}
        friction={0}
      >
        <primitive
          ref={characterMesh}
          object={scene}
          scale={0.18}
          rotation-y={Math.PI}
        />
        <CapsuleCollider args={[0.3, 0.25]} position={[0, 0.58, 0]} />
      </RigidBody>
    </>
  );
};

useGLTF.preload(CharacterModel);
useGLTF.preload(IslandSensorsModel);

export default CharacterController;
