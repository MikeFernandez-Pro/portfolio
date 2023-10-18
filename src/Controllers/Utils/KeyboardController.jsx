import { useGLTF, useKeyboardControls, useAnimations, ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import { useControls } from "leva";
import { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useStore } from "./ZustandStorage.jsx";

import MobileController from "./Controllers/MobileController.jsx";


// Character rotation and SPEED settings
const ROTATION_AXE = new THREE.Vector3(0, 1, 0);
const QUATERNION_AXE = new THREE.Quaternion();
const SPEED = 4.5;

// Camera position setings
const CAMERA_POSITION = new THREE.Vector3(0, 0, 0);
const CAMERA_OFFSET = new THREE.Vector3(0, 4, 5.5);
const LERP_CAMERA_POSITION = new THREE.Vector3(0, 0, 0);

// Character animmations
const IDLE = "Idle"
const RUN = "Run"

const directionOffset = ({ forward, backward, leftward, rightward }, characterBody, activateCameraTracking) => {

    if (!forward && !backward && !leftward && !rightward) return null;

    if (!activateCameraTracking.current)
        activateCameraTracking.current = true

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

const animationUpdate = (actions, currentAnimation) => {
    // Stop current animation
    actions[currentAnimation].fadeOut(0.2);

    // Update current animation
    currentAnimation === IDLE ?
        currentAnimation = RUN :
        currentAnimation = IDLE

    // Start new animation
    actions[currentAnimation].reset().fadeIn(0.2).play();
}

const resetLinearVelocity = (characterBody, resetY = false) => {
    characterBody.setLinvel({
        x: 0,
        y: resetY ? 1.5 : characterBody.linvel.y,
        z: 0,
    });
}

const Player = ({ joystickAngle, orbitControls }) => {

    /**
     * Character Initialization
     */

    const characterBody = useRef();
    const characterMesh = useRef();
    const characterAnimation = useRef(IDLE);

    // Character model and animations loaders
    const {scene: characterModel, animations} = useGLTF("/models/character/character.glb");
    const {actions} = useAnimations(characterModel, animations);

    const characterSleeping = useRef(false);

    // Shadows initialization
    characterModel.traverse((child) => {
        if (child.isMesh && child.material.isMeshStandardMaterial) {
            child.castShadow = true;
        }
    });

    const activateCameraTracking = useRef(false)


    const pageVisibiliy = useRef(true)


    const { camera } = useThree();

    const [subscribeKeys, getKeys] = useKeyboardControls();

    // current character direction
    let direction;
    let characterPosition;


    useFrame((state, delta) => {

        /**
         * Camera Controller
         */
        direction = directionOffset(getKeys(), characterBody, activateCameraTracking);

        if (orbitControls || (characterSleeping && characterSleeping.current)) return;

        if (characterBody.current) {
            characterPosition = characterBody.current.translation();

            if (characterPosition.y < 0) {
                resetLinearVelocity(characterBody.current, true);
            }

            useStore.setState({ characterPosition: characterPosition });
            CAMERA_POSITION.addVectors(characterPosition, CAMERA_OFFSET);
            LERP_CAMERA_POSITION.lerp(CAMERA_POSITION, 5 * delta);

            if (activateCameraTracking.current) {
                state.camera.position.copy(LERP_CAMERA_POSITION); // A REACTIVER PÖUR SUIVRE PERSO
            }


            // Reset character velocity and animation when leaving the page OR if no keys are pressed 
            if (direction === null || !pageVisibiliy.current) {
                animationUpdate(actions, characterAnimation.current)
                resetLinearVelocity(characterBody.current);
                return;
            }

            // Update character velocity, rotation and animation
            animationUpdate(actions, characterAnimation.current)

            characterBody.current.setLinvel({
                x: SPEED * Math.cos(direction) * -1 /* * delta */,
                y: characterBody.current.linvel().y,
                z: SPEED * Math.sin(direction) /* * delta */,
            });

            QUATERNION_AXE.setFromAxisAngle(ROTATION_AXE, direction - Math.PI / 2);
            characterMesh.current.quaternion.rotateTowards(QUATERNION_AXE, 0.3);
        }
    });

    useEffect(() => {
        // Default animation
        actions[IDLE].fadeIn(0.2).play();
    }, []);

    document.addEventListener("visibilitychange", () => {
        // Check page visibility
        if (document.visibilityState === "visible") {
            pageVisibiliy.current = true;
            //   backgroundMusic.play();
        } else {
            pageVisibiliy.current = false;
            characterBody.current.sleep();
            //   backgroundMusic.pause();
        }
    });

    return (
        <>
            <RigidBody
                type={"dynamic"}
                lockRotations
                ref={characterBody}
                colliders={false}
                position={[0, 1.5, 0]}
                onSleep={() => characterSleeping.current = true}
                onWake={() => characterSleeping.current = false}
                restitution={-10}
                friction={0.4}
            >
                <primitive
                    ref={characterMesh}
                    object={characterModel}
                    scale={0.18}
                    rotation-y={Math.PI}
                />
                <CapsuleCollider args={[0.3, 0.25]} position={[0, 0.55, 0]} />
            </RigidBody>
            {/* <MobileController joystickAngle={joystickAngle} characterBody={characterBody} SPEED={SPEED} setCharacterAnimation={setCharacterAnimation}/> */}
        </>
    );
};

useGLTF.preload("/models/character/character.glb");

export default Player;
