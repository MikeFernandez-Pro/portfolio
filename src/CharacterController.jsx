import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { useRef, useMemo, useCallback, useLayoutEffect } from "react";
import * as THREE from "three";
import { useStore } from "./ZustandStorage.jsx";
import gsap from "gsap";
import { Howl } from "howler";
import { IS_MOBILE_DEVICE } from "./utils/utils.js";

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
const IDLE = "Idle";
const RUN = "Run";
const SPRINT = "Sprint";
const JUMP = "JumpRunning";

// default configuration
let characterSpeed = 4;
let canJump = false;
let currentAnimation = IDLE;
let characterIsMoving = false;
let characterJumping = false;
let characterSprinting = false;

let runningSoundEffect = new Howl({
  src: ["/sounds/runningSoundEffect.mp3"],
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
  ArrowUp: "forward",
  ArrowDown: "backward",
  ArrowLeft: "leftward",
  ArrowRight: "rightward",
  KeyW: "forward",
  KeyS: "backward",
  KeyA: "leftward",
  KeyD: "rightward",
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
  const { scene, animations } = useMemo(
    () => useGLTF("/models/character/character.glb"),
    []
  );
  const characterAnimations = useAnimations(animations, scene);

  const updateCharacterAnimation = useCallback((newAnimation) => {
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

  const keyboardEventHandler = (event) => {
    event.preventDefault();
    if (keysConfigList[event.code]) {
      eventKeys[keysConfigList[event.code]] =
        event.type === "keydown" ? true : false;
    }

    if (event.code === "Space" && event.type === "keydown") {
      characterJumpEvent();
    }
    if (
      ((event.code === "ShiftLeft" && event.type === "keydown") ||
        event.shiftKey) &&
      !characterIsMoving
    )
      return;
    characterSpeed =
      (event.code === "ShiftLeft" && event.type === "keydown") || event.shiftKey
        ? 6
        : 4;
    characterSprinting =
      (event.code === "ShiftLeft" && event.type === "keydown") || event.shiftKey
        ? true
        : false;
    if (
      ((event.code === "ShiftLeft" && event.type === "keydown") ||
        event.shiftKey) &&
      currentAnimation !== SPRINT &&
      !characterJumping
    ) {
      updateCharacterAnimation(SPRINT);
      runningSoundEffect.stop();
      runningSoundEffect.play();
      runningSoundEffect.rate(1.5);
    }
    if (event.code === "ShiftLeft" && event.type === "keyup") {
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

  const cameraOffsetOnMouseMove = useCallback((event) => {
    CAMERA_OFFSET.x = ((event.clientX / window.innerWidth) * 2 - 1) * 0.5;
  }, []);

  // Current character direction and position
  let direction;
  let characterPosition;

  const { nodes } = useMemo(
    () => useGLTF("/models/islandSensors/islandSensors.glb"),
    []
  );
  nodes.Sensor.material.visible = false;

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

  const camera = useThree((state) => state.camera);

  useLayoutEffect(() => {
    // Shadows initialization
    if (!IS_MOBILE_DEVICE) {
      const mesh = scene.getObjectByName("knight");
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
      (state) => state.experienceStarted,
      (experienceStarted) => {
        if (experienceStarted) {
          // Set camera default position
          gsap.to(CAMERA_OFFSET, {
            duration: 5,
            x: 0,
            y: 4,
            z: IS_MOBILE_DEVICE ? 7.5 : 5.5,
            ease: "power3.out",
            onComplete: () => (controllerActivated = true),
          });
        }
      }
    );

    // JoyStick subscriber
    const unsubJoystickAngle = !IS_MOBILE_DEVICE
      ? undefined
      : useStore.subscribe(
          (state) => state.joystickAngle,
          (joystickAngle) => (joystickAngleRef.current = joystickAngle)
        );

    // Event Listeners
    if (!IS_MOBILE_DEVICE) {
      window.addEventListener("blur", pauseCharacter);
      document.addEventListener("keydown", keyboardEventHandler);
      document.addEventListener("keyup", keyboardEventHandler);
      window.addEventListener("mousemove", cameraOffsetOnMouseMove);
    }

    return () => {
      unsubExperienceStarted();
      if (!IS_MOBILE_DEVICE) {
        window.removeEventListener("blur", pauseCharacter);
        document.removeEventListener("keydown", keyboardEventHandler);
        document.removeEventListener("keyup", keyboardEventHandler);
        window.removeEventListener("mousemove", cameraOffsetOnMouseMove);
      }
      if (IS_MOBILE_DEVICE) unsubJoystickAngle();
    };
  }, []);

  return (
    <>
      <RigidBody
        type={"fixed"}
        colliders={"trimesh"}
        sensor
        onIntersectionEnter={(state) => {
          canJump = true;
          characterJumping = false;
        }}
        onIntersectionExit={(state) => (canJump = false)}
      >
        <mesh
          scale={0.45}
          position={[-1.35, 2.4, -15]}
          geometry={nodes.Sensor.geometry}
          material={nodes.Sensor.material}
        />
      </RigidBody>
      <RigidBody
        type={"fixed"}
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

useGLTF.preload("/models/character/character.glb");
useGLTF.preload("/models/islandSensors/islandSensors.glb");

export default CharacterController;
