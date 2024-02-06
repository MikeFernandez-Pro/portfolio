import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import { useRef, useMemo, useCallback, useLayoutEffect, useEffect } from "react";
import * as THREE from "three";
import { useStore } from "./ZustandStorage.jsx";
import gsap from "gsap";
import { useControls } from "leva";

function lerp(a, b, alpha) {
    return a + alpha * (b - a)
}

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

// Character Settings
let SPEED = 4 // 4.5
const ROTATION_EULER = new THREE.Vector3(0, 1, 0);
const ROTATION_QUATERNION = new THREE.Quaternion();
const IDLE = "Idle";
const RUN = "Run";
const DYNAMIC = 0;
const FIXED = 1;

// Camera Settings

const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

const LERP_CAMERA_POSITION = new THREE.Vector3(0, 5.2, isMobile ? 7.5 : 5.5);

const CAMERA_POSITION = new THREE.Vector3(0, 0, 0);

let canJump = false;

const Player = ({ orbitControls }) => {

    const { rapier, world } = useRapier()

    const cameraControls = useControls("Camera", {
        position: { value: [-9.1, 16.8, 28.8], step: 0.1 },
    })

    // Mobile Controller settings
    const disableSounds = useStore(state => state.disableSounds);
    const joystickAngleRef = useRef(useStore.getState().joystickAngle);

    const cameraOffset = useMemo(() =>
        isMobile ?
            new THREE.Vector3(0, 4, 7.5) :
            new THREE.Vector3(0, 4, 5.5)
        , [isMobile])


    const characterTrackingRef = useRef(false);
    /**
     * Character Initialization
     */

    const characterBody = useRef();
    const characterMesh = useRef();
    const capsuleColliderRef = useRef();
    const characterAnimation = useRef(IDLE);
    const runningSoundEffect = useRef(undefined);

    // Character Model and animations loaders
    const characterModel = useMemo(() => useGLTF("/models/character/character.glb"), [])
    const characterAnimations = useAnimations(characterModel.animations, characterModel.scene)

    // Shadows initialization
    if (!isMobile) {
        characterModel.scene.traverse((child) => {
            // Check if the child object is a Mesh
            if (child.isMesh && child.material.name === "texture") {
                child.castShadow = true;
                child.material.envMapIntensity = 0.5;
            }
        })
    }

    const characterJump = () => {
        if (canJump)
        characterBody.current.applyImpulse({ x: 0, y: 1.2, z: 0 })
    }

    const keyEventsRef = useRef({
        "forward": false,
        "backward": false,
        "leftward": false,
        "rightward": false,
        "enter": false,
    })

    // Keyboard Controller configuration
    const keyboardEventHandler = useCallback((event) => {
        if (event.code === "ArrowUp" || event.code === "KeyW")
            keyEventsRef.current.forward = event.type === "keydown" ? true : false;
        if (event.code === "ArrowDown" || event.code === "KeyS")
            keyEventsRef.current.backward = event.type === "keydown" ? true : false;
        if (event.code === "ArrowLeft" || event.code === "KeyA")
            keyEventsRef.current.leftward = event.type === "keydown" ? true : false;
        if (event.code === "ArrowRight" || event.code === "KeyD")
            keyEventsRef.current.rightward = event.type === "keydown" ? true : false;
        if (event.code === "Space" && event.type === "keydown")
            characterJump()
        SPEED = (event.code === "ShiftLeft" && event.type === "keydown") || event.shiftKey ? 6 : 4;

        // if (((event.code === "ShiftLeft" && event.type === "keydown") || event.shiftKey)
        // && characterAnimation.current !== "Walk") {
        //         characterAnimations.actions[characterAnimation.current].fadeOut(0.2);
        //         characterAnimation.current = "Walk";
        //         characterAnimations.actions[characterAnimation.current].timeScale = 1.5
        //         characterAnimations.actions[characterAnimation.current].reset().fadeIn(0.2).play();
        // }
    }, []);

    // Pause character physics and keystroke handling
    const pauseCharacter = useCallback(() => {
        for (const key in keyEventsRef.current)
            keyEventsRef.current[key] = false;
        characterBody.current.setBodyType(FIXED)
    }, [])

    const cameraOffsetOnMouseMove = useCallback((event) => {
        cameraOffset.x = (event.clientX / window.innerWidth * 2 - 1) * 0.3;
        cameraOffset.y = (-(event.clientY / window.innerHeight * 2 - 1) * 0.3) + 4;
    }, [])

    // Current character direction and position
    let direction;
    let characterPosition;

    const { nodes } = useMemo(() => useGLTF("/models/islandColliders/islandColliders2.glb"), [])
    console.log(nodes)
    nodes.Collider.material.visible = false;


    useFrame((state, delta) => {

        if (!characterTrackingRef.current)
            return;
        /**
         * Camera Controller
         */
        direction = directionOffset(keyEventsRef.current, characterBody)

        characterPosition = characterBody.current.translation();

        if (characterPosition.y < 0) {
            characterBody.current.setTranslation({
                x: 0,
                y: 1.5,
                z: 0
            })
        }
        /*
        * Camera Controller
        */
        useStore.setState({ characterPosition: characterPosition });



        CAMERA_POSITION.addVectors(characterPosition, cameraOffset);
        LERP_CAMERA_POSITION.lerp(CAMERA_POSITION, 5 * delta);
        state.camera.position.set(...LERP_CAMERA_POSITION); // A REACTIVER PÖUR SUIVRE PERSO

        /**
         * Character Controller
         */
        // Update character velocity and orientation
        if ((direction === undefined && !isMobile)
            || (isMobile && joystickAngleRef.current === undefined)) {
            if (characterAnimation.current !== IDLE) {
                characterAnimations.actions[characterAnimation.current].fadeOut(0.2);
                characterAnimation.current = IDLE;

                useStore.setState({ isCharacterMoving: false });

                characterAnimations.actions[characterAnimation.current].reset().fadeIn(0.2).play();

                if (disableSounds === false) {
                    runningSoundEffect.current.pause();
                    runningSoundEffect.current.currentTime = 0;
                }

            }

            characterBody.current.setLinvel({
                x: 0,
                y: characterBody.current.linvel().y,
                z: 0,
            }, true);
            // characterBody.current.sleep();
            return;
        }

        if (characterBody.current.bodyType() === FIXED)
            characterBody.current.setBodyType(DYNAMIC)

        if (characterAnimation.current !== RUN) {
            characterAnimations.actions[characterAnimation.current].fadeOut(0.2);
            characterAnimation.current = RUN;
            characterAnimations.actions[characterAnimation.current].reset().fadeIn(0.2).play();
            useStore.setState({ isCharacterMoving: true });
            if (disableSounds === false) {
                runningSoundEffect.current.volume = 0.6;
                runningSoundEffect.current.play();
            }
        }

        characterBody.current.setLinvel({
            x: SPEED * Math.cos(isMobile ? joystickAngleRef.current : direction) * (isMobile ? 1 : -1)/* * delta */,
            y: characterBody.current.linvel().y,
            z: SPEED * Math.sin(isMobile ? joystickAngleRef.current : direction) * (isMobile ? -1 : 1)/* * delta */,
        }, true);

        ROTATION_QUATERNION.setFromAxisAngle(ROTATION_EULER, (isMobile ? joystickAngleRef.current + Math.PI / 2 : direction - Math.PI / 2));
        characterMesh.current.quaternion.rotateTowards(ROTATION_QUATERNION, 15 * delta); //017 avant


    });

    const camera = useThree(state => state.camera);

    useLayoutEffect(() => {


        const unsubJoystickAngle = useStore.subscribe(state => state.joystickAngle,
            joystickAngle => joystickAngleRef.current = joystickAngle)


        // Set character default animation
        characterAnimations.actions[IDLE].fadeIn(0.2).play();
        characterAnimations.actions["KeyAction"].fadeIn(0.2).play()

        // Listen to window blur and keyboards events
        window.addEventListener("blur", pauseCharacter);
        document.addEventListener('keydown', keyboardEventHandler)
        document.addEventListener('keyup', keyboardEventHandler)
        window.addEventListener("mousemove", cameraOffsetOnMouseMove)



        // Set camera default position
        gsap.to(camera.position, {
            duration: 7,
            x: 0,
            y: 5.2,
            z: cameraOffset.z,
            ease: "power3.out",
            onComplete: () => characterTrackingRef.current = true
        })

        return () => {
            window.removeEventListener("blur", pauseCharacter);
            document.removeEventListener('keydown', keyboardEventHandler)
            document.removeEventListener('keyup', keyboardEventHandler)
            window.removeEventListener("mousemove", cameraOffsetOnMouseMove)
            unsubJoystickAngle();
        }
    }, []);

    useEffect(() => {
        // Character sound Effect initialization
        runningSoundEffect.current =
            (() => {
                if (disableSounds !== false) return undefined;
                const soundEffect = new Audio("/sounds/runningSoundEffect.mp3");
                soundEffect.loop = true;
                return soundEffect;
            })()
    }, [disableSounds])


    return (
        <>
         <RigidBody type={"fixed"} colliders={"trimesh"}
          sensor
          onIntersectionEnter={(state) =>
                canJump = true
          }
          onIntersectionExit={(state) => canJump = false}

         >
                <mesh
                    scale={0.45}
                    position={[-1.35, 2.5, -15]}
                    geometry={nodes.Collider.geometry}
                    material={nodes.Collider.material}
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
                friction={0.4}
            >
                <primitive
                    ref={characterMesh}
                    object={characterModel.scene}
                    scale={0.18}
                    rotation-y={Math.PI}
                />
                <CapsuleCollider ref={capsuleColliderRef} args={[0.3, 0.25]} position={[0, 0.58, 0]} />
            </RigidBody>
        </>
    );
};

useGLTF.preload("/models/character/character.glb");

export default Player;
