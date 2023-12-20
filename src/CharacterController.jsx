import { useGLTF, useKeyboardControls, useAnimations, ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import { useControls } from "leva";
import { useRef, useState, useEffect, useMemo, useCallback, useLayoutEffect } from "react";
import * as THREE from "three";
import { useStore } from "./ZustandStorage.jsx";

import MobileController from "./Controllers/MobileController.jsx";

const directionOffset = ({ forward, backward, leftward, rightward }, knightBody) => {

    if (!forward && !backward && !leftward && !rightward) return undefined;

    if (knightBody.current.isSleeping()) {
        knightBody.current.wakeUp();
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

const runningSound = new Audio("/sounds/running Sound Effect by Pixabay.mp3");
runningSound.loop = true;

const Player = ({ orbitControls }) => {

    const isMobile = useStore(state => state.isMobile);
    const joystickAngle = useStore(state => state.joystickAngle);

    /**
     * Character Initialization
     */

    const knightBody = useRef();
    const knightMesh = useRef();
    const knightAnimation = useRef(IDLE);

    // Character Model and animations loaders
    const knightModel = useMemo(() => useGLTF("/models/character/shapeKeysKnightCharacter.glb"), [])
    const knightAnimations = useAnimations(knightModel.animations, knightModel.scene)


    // Shadows initialization
    knightModel.scene.traverse((child) => {
        // Check if the child object is a Mesh
        if (child.isMesh && child.material.name === "texture") {
            child.castShadow = true;
        }
    });

    const keyEventsRef = useRef({
        "forward": false,
        "backward": false,
        "leftward": false,
        "rightward": false,
        "enter": false,
    })

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

    const pauseCharacter = useCallback(() => {
        for (const key in keyEventsRef.current)
            keyEventsRef.current[key] = false;
        knightBody.current.setBodyType(FIXED)
    }, [])

    useEffect(() => {
        window.addEventListener("blur", pauseCharacter);
        document.addEventListener('keydown', keyboardEventHandler)
        document.addEventListener('keyup', keyboardEventHandler)

        return () => {
            window.removeEventListener("blur", pauseCharacter);
            document.removeEventListener('keydown', keyboardEventHandler)
            document.removeEventListener('keyup', keyboardEventHandler)
        }
    }, []);

    // current character direction
    let direction;
    let knightPosition;

    useFrame((state, delta) => {

        /**
         * Camera Controller
         */
        direction = directionOffset(keyEventsRef.current, knightBody)

        knightPosition = knightBody.current.translation();

        if (knightPosition.y < 0) {
            knightBody.current.setTranslation({
                x: 0,
                y: 1.5,
                z: 0
            })
        }
        /*
        * Camera Controller
        */
        useStore.setState({ characterPosition: knightPosition });
        CAMERA_POSITION.addVectors(knightPosition, CAMERA_OFFSET);
        LERP_CAMERA_POSITION.lerp(CAMERA_POSITION, 5 * delta);

        state.camera.position.copy(LERP_CAMERA_POSITION); // A REACTIVER PÖUR SUIVRE PERSO

        /**
         * Character Controller
         */
        // Update character velocity and orientation
        if ((direction === undefined && !isMobile)
            || (isMobile && joystickAngle === undefined)) {
            if (knightAnimation.current !== IDLE) {
                knightAnimations.actions[knightAnimation.current].fadeOut(0.2);
                knightAnimation.current = (IDLE);
                knightAnimations.actions[knightAnimation.current].reset().fadeIn(0.2).play();
                runningSound.pause();
                runningSound.currentTime = 0;
            }

            // knightBody.current.setLinvel({
            //     x: 0,
            //     y: knightBody.current.linvel().y,
            //     z: 0,
            // }, false);
            knightBody.current.sleep();
            return;
        }

        if (knightBody.current.bodyType() === FIXED)
            knightBody.current.setBodyType(DYNAMIC)

        if (knightAnimation.current !== RUN) {
            knightAnimations.actions[knightAnimation.current].fadeOut(0.2);
            knightAnimation.current = RUN;
            knightAnimations.actions[knightAnimation.current].reset().fadeIn(0.2).play();
            runningSound.volume = 0.5;
            runningSound.play();            
        }

        knightBody.current.setLinvel({
            x: SPEED * Math.cos(isMobile ? joystickAngle : direction) * (isMobile ? 1 : -1)/* * delta */,
            y: knightBody.current.linvel().y,
            z: SPEED * Math.sin(isMobile ? joystickAngle : direction) * (isMobile ? -1 : 1)/* * delta */,
        }, true);

        ROTATION_QUATERNION.setFromAxisAngle(ROTATION_EULER, (isMobile ? joystickAngle + Math.PI / 2 : direction - Math.PI / 2));
        knightMesh.current.quaternion.rotateTowards(ROTATION_QUATERNION, 15 *  delta); //017 avant

    });

    useLayoutEffect(() => {
        knightAnimations.actions[IDLE].fadeIn(0.2).play();
        knightAnimations.actions["KeyAction"].fadeIn(0.2).play()
    }, []);

    return (
        <>
            <RigidBody
                type={"fixed"}
                lockRotations
                ref={knightBody}
                colliders={false}
                // position-y={0.7}
                position={[-5, 7, -45]}
                
                restitution={-10}
                friction={0.4}
            >
                <primitive
                    ref={knightMesh}
                    object={knightModel.scene}
                    scale={0.18}
                    rotation-y={Math.PI}
                />
                <CapsuleCollider args={[0.3, 0.25]} position={[0, 0.55, 0]} />
            </RigidBody>
        </>
    );
};

useGLTF.preload("/models/character/character.glb");

export default Player;
