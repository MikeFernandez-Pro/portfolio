import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { useRef, useMemo, useCallback, useLayoutEffect, useEffect } from "react";
import * as THREE from "three";
import { useStore } from "./ZustandStorage.jsx";
import gsap from "gsap";

const directionOffset = ({ forward, backward, leftward, rightward }, characterBody) => {
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

// sound
const RUNNING_SOUND_VOLUME = 0.6;

// default configuration
let characterSpeed = 4;
let canJump = false;
let currentAnimation = IDLE;
let characterIsMoving = false;
let characterJumping = false;
let characterSprinting = false;
let runningSoundEffect = new Audio("/sounds/runningSoundEffect.mp3");
runningSoundEffect.loop = true;
runningSoundEffect.volume = RUNNING_SOUND_VOLUME;
runningSoundEffect.playbackRate = 1.1;

/*
 *  Controller
 */
const ROTATION_EULER = new THREE.Vector3(0, 1, 0);
const ROTATION_QUATERNION = new THREE.Quaternion();
let controllerActivated = false;

/*
 *  Mobile
 */
const MOBILE_DEVICE = "ontouchstart" in window || navigator.maxTouchPoints > 0;

/*
 *  Camera
 */
const CAMERA_POSITION = new THREE.Vector3(0, 0, 0);
const LERP_CAMERA_POSITION = new THREE.Vector3(0, 5.2, MOBILE_DEVICE ? 7.5 : 5.5);
// const CAMERA_OFFSET = new THREE.Vector3(0, 4, MOBILE_DEVICE ? 7.5 : 5.5);
let CAMERA_OFFSET = new THREE.Vector3(-3.5, 17.4, 29.6)

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

    // Sound
    const soundActivatedRef = useRef(useStore.getState().soundActivated);

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
            eventKeys[keysConfigList[event.code]] = event.type === "keydown" ? true : false;
        }

        if (event.code === "Space" && event.type === "keydown") {
            characterJumpEvent();
        }
        if (
            ((event.code === "ShiftLeft" && event.type === "keydown") || event.shiftKey) &&
            !characterIsMoving
        )
            return;
        characterSpeed =
            (event.code === "ShiftLeft" && event.type === "keydown") || event.shiftKey ? 6 : 4;
        characterSprinting =
            (event.code === "ShiftLeft" && event.type === "keydown") || event.shiftKey
                ? true
                : false;
        if (
            ((event.code === "ShiftLeft" && event.type === "keydown") || event.shiftKey) &&
            currentAnimation !== SPRINT &&
            !characterJumping
        ) {
            updateCharacterAnimation(SPRINT);
            runningSoundEffect.playbackRate = 1.5;
        }
        if (event.code === "ShiftLeft" && event.type === "keyup") {
            runningSoundEffect.playbackRate = 1.1;
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

    const { nodes } = useMemo(() => useGLTF("/models/islandSensors/islandSensors.glb"), []);
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

        CAMERA_POSITION.addVectors(characterPosition, CAMERA_OFFSET);
        LERP_CAMERA_POSITION.lerp(CAMERA_POSITION, 5 * delta);
        state.camera.position.set(...LERP_CAMERA_POSITION); // A REACTIVER PÖUR SUIVRE PERSO

        /**
         * Character Controller
         */
        // Update character velocity and orientation
        if (
            (direction === undefined && !MOBILE_DEVICE) ||
            (MOBILE_DEVICE && joystickAngleRef.current === undefined)
        ) {
            if (currentAnimation !== IDLE && !characterJumping) {
                updateCharacterAnimation(IDLE);

                useStore.setState({ isCharacterMoving: false });

                runningSoundEffect.pause();
                runningSoundEffect.currentTime = 0;
            }

            characterBody.current.setLinvel(
                {
                    x: 0,
                    y: characterBody.current.linvel().y,
                    z: 0,
                },
                true
            );
            // characterBody.current.sleep();
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
                    Math.cos(MOBILE_DEVICE ? joystickAngleRef.current : direction) *
                    (MOBILE_DEVICE ? 1 : -1) /* * delta */,
                y: characterBody.current.linvel().y,
                z:
                    characterSpeed *
                    Math.sin(MOBILE_DEVICE ? joystickAngleRef.current : direction) *
                    (MOBILE_DEVICE ? -1 : 1) /* * delta */,
            },
            true
        );

        ROTATION_QUATERNION.setFromAxisAngle(
            ROTATION_EULER,
            MOBILE_DEVICE ? joystickAngleRef.current + Math.PI / 2 : direction - Math.PI / 2
        );
        characterMesh.current.quaternion.rotateTowards(ROTATION_QUATERNION, 15 * delta); //017 avant
    });

    const camera = useThree((state) => state.camera);

    useLayoutEffect(() => {
        // Shadows initialization
        if (!MOBILE_DEVICE) {
            const mesh = scene.getObjectByName("knight");
            mesh.castShadow = true;
            mesh.material.envMapIntensity = 0.5;
        }

        // Set character default animation
        characterAnimations.actions[IDLE].fadeIn(0.2).play();

        // Jump animation configuration
        characterAnimations.actions[JUMP].loop = THREE.LoopOnce;
        characterAnimations.actions[JUMP].clampWhenFinished = true;

        // characterAnimations.actions[JUMP].loop = THREE.LoopOnce;
        // characterAnimations.actions[JUMP].clampWhenFinished = true;

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
                        z: MOBILE_DEVICE ? 7.5 : 5.5,
                        ease: "power3.out",
                        onComplete: () => controllerActivated = true
                    });
                }
            }
        );

        // JoyStick subscriber
        const unsubJoystickAngle = !MOBILE_DEVICE
            ? undefined
            : useStore.subscribe(
                  (state) => state.joystickAngle,
                  (joystickAngle) => (joystickAngleRef.current = joystickAngle)
              );

        // Sound subscriber
        const unsubSoundActivated = useStore.subscribe(
            (state) => state.soundActivated,
            (soundActivated) => {
                soundActivatedRef.current = soundActivated;
                runningSoundEffect.volume = soundActivated ? RUNNING_SOUND_VOLUME : 0;
            }
        );

        // Event Listeners
        window.addEventListener("blur", pauseCharacter);
        if (!MOBILE_DEVICE) {
            document.addEventListener("keydown", keyboardEventHandler);
            document.addEventListener("keyup", keyboardEventHandler);
            window.addEventListener("mousemove", cameraOffsetOnMouseMove);
        }

        return () => {
            window.removeEventListener("blur", pauseCharacter);
            unsubSoundActivated();
            unsubExperienceStarted();
            if (!MOBILE_DEVICE) {
                document.removeEventListener("keydown", keyboardEventHandler);
                document.removeEventListener("keyup", keyboardEventHandler);
                window.removeEventListener("mousemove", cameraOffsetOnMouseMove);
            }
            if (MOBILE_DEVICE) unsubJoystickAngle();
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
                position-y={0.7} // ile 1
                // position={[6, 3, -30]} // ile 2
                // position={[-16, 5, -35]} // ile 3
                // position={[-5, 7, -45]} // ile 4
                // position={[-9.8 , 6.8, -58]} // ile 4
                // onCollisionEnter={() => canJump = true}
                // onCollisionExit={() => canJump = false}
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

