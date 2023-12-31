import { useGLTF, useKeyboardControls, useAnimations, ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import { useControls } from "leva";
import { useRef, useState, useEffect, useMemo, useCallback, useLayoutEffect } from "react";
import * as THREE from "three";
import { useStore } from "./ZustandStorage.jsx";

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
const SPEED = 4 // 4.5
const ROTATION_EULER = new THREE.Vector3(0, 1, 0);
const ROTATION_QUATERNION = new THREE.Quaternion();
const IDLE = "Idle";
const RUN = "Run";
const DYNAMIC = 0;
const FIXED = 1;

// Camera Settings
const CAMERA_POSITION = new THREE.Vector3(0, 0, 0);
const CAMERA_OFFSET = new THREE.Vector3(0, 4, 5.5);
const LERP_CAMERA_POSITION = new THREE.Vector3(0, 0, 0);



const Player = ({ orbitControls }) => {

    // Mobile Controller settings
    const isMobile = useStore(state => state.isMobile);
    const joystickAngle = useStore(state => state.joystickAngle);

    /**
     * Character Initialization
     */

    const characterBody = useRef();
    const characterMesh = useRef();
    const characterAnimation = useRef(IDLE);

    // Character Model and animations loaders
    const characterModel = useMemo(() => useGLTF("/models/character/shapeKeysKnightCharacter.glb"), [])
    const characterAnimations = useAnimations(characterModel.animations, characterModel.scene)

    // Shadows initialization
    characterModel.scene.traverse((child) => {
        // Check if the child object is a Mesh
        if (child.isMesh && child.material.name === "texture") {
            child.castShadow = true;
            child.material.envMapIntensity = 0.5;
        }
    });

    // Character sound Effect initialization
    const runningSoundEffect = useMemo(() => {
        const soundEffect = new Audio("/sounds/running Sound Effect by Pixabay.mp3");
        soundEffect.loop = true;
        return soundEffect;
    }, []);

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
    }, []);

    // Pause character physics and keystroke handling
    const pauseCharacter = useCallback(() => {
        for (const key in keyEventsRef.current)
            keyEventsRef.current[key] = false;
        characterBody.current.setBodyType(FIXED)
    }, [])

    // Current character direction and position
    let direction;
    let characterPosition;

    useFrame((state, delta) => {

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
        CAMERA_POSITION.addVectors(characterPosition, CAMERA_OFFSET);
        LERP_CAMERA_POSITION.lerp(CAMERA_POSITION, 5 * delta);

        state.camera.position.copy(LERP_CAMERA_POSITION); // A REACTIVER PÖUR SUIVRE PERSO

        /**
         * Character Controller
         */
        // Update character velocity and orientation
        if ((direction === undefined && !isMobile)
            || (isMobile && joystickAngle === undefined)) {
            if (characterAnimation.current !== IDLE) {
                characterAnimations.actions[characterAnimation.current].fadeOut(0.2);
                characterAnimation.current = IDLE;

                useStore.setState({ isCharacterMoving: false });

                characterAnimations.actions[characterAnimation.current].reset().fadeIn(0.2).play();

                runningSoundEffect.pause();
                runningSoundEffect.currentTime = 0;

            }

            characterBody.current.sleep();
            return;
        }

        if (characterBody.current.bodyType() === FIXED)
            characterBody.current.setBodyType(DYNAMIC)

        if (characterAnimation.current !== RUN) {
            characterAnimations.actions[characterAnimation.current].fadeOut(0.2);
            characterAnimation.current = RUN;
            characterAnimations.actions[characterAnimation.current].reset().fadeIn(0.2).play();
            useStore.setState({ isCharacterMoving: true });
            runningSoundEffect.volume = 0.6;
            runningSoundEffect.play();
        }

        characterBody.current.setLinvel({
            x: SPEED * Math.cos(isMobile ? joystickAngle : direction) * (isMobile ? 1 : -1)/* * delta */,
            y: characterBody.current.linvel().y,
            z: SPEED * Math.sin(isMobile ? joystickAngle : direction) * (isMobile ? -1 : 1)/* * delta */,
        }, true);

        ROTATION_QUATERNION.setFromAxisAngle(ROTATION_EULER, (isMobile ? joystickAngle + Math.PI / 2 : direction - Math.PI / 2));
        characterMesh.current.quaternion.rotateTowards(ROTATION_QUATERNION, 15 * delta); //017 avant

    });


    useLayoutEffect(() => {

        // Set character default animation
        characterAnimations.actions[IDLE].fadeIn(0.2).play();
        characterAnimations.actions["KeyAction"].fadeIn(0.2).play()
        
        // Listen to window blur and keyboards events
        window.addEventListener("blur", pauseCharacter);
        document.addEventListener('keydown', keyboardEventHandler)
        document.addEventListener('keyup', keyboardEventHandler)

        return () => {
            window.removeEventListener("blur", pauseCharacter);
            document.removeEventListener('keydown', keyboardEventHandler)
            document.removeEventListener('keyup', keyboardEventHandler)
        }
    }, []);


    return (
        <>
            <RigidBody
                type={"fixed"}
                lockRotations
                ref={characterBody}
                colliders={false}
                // position-y={0.7}
                // position={[-5, 7, -45]} // ile 4
                // position={[-16, 5, -35]} // ile 3
                position={[6, 3, -30]} // ile 2

                restitution={-10}
                friction={0.4}
            >
                <primitive
                    ref={characterMesh}
                    object={characterModel.scene}
                    scale={0.18}
                    rotation-y={Math.PI}
                />
                <CapsuleCollider args={[0.3, 0.25]} position={[0, 0.58, 0]} />
            </RigidBody>
        </>
    );
};

useGLTF.preload("/models/character/character.glb");

export default Player;
