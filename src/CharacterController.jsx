import { useGLTF, useKeyboardControls, useAnimations, ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import { useControls } from "leva";
import { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useStore } from "./ZustandStorage.jsx";

import MobileController from "./Controllers/MobileController.jsx";

const directionOffset = ({ forward, backward, leftward, rightward }, knightBody, activateCameraTracking) => {

    // if (enter) 
    //     window.open("https://www.google.fr/", "_blank")

    if (!forward && !backward && !leftward && !rightward) return null;

    if (!activateCameraTracking.current)
        activateCameraTracking.current = true

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

const updateCharacterLinvel = (knightBody, direction, joystickAngle, x = null, y = null, z = null) => {
    knightBody.current.setLinvel({
        x: x || SPEED * Math.cos( joystickAngle || direction) * -1 /* * delta */,
        y: y || knightBody.current.linvel().y,
        z: z || SPEED * Math.sin( joystickAngle || direction) /* * delta */,
    });
}

// Character Settings
const SPEED = 4.5;
const ROTATION_EULER = new THREE.Vector3(0, 1, 0);
const ROTATION_QUATERNION = new THREE.Quaternion();
const IDLE = "Idle";
const RUN = "Run";

// Camera Settings
const CAMERA_POSITION = new THREE.Vector3(0, 0, 0);
const CAMERA_OFFSET = new THREE.Vector3(0, 4, 5.5);
const LERP_CAMERA_POSITION = new THREE.Vector3(0, 0, 0);

const Player = ({ orbitControls }) => {

    const isMobile = useStore(state => state.isMobile);
    const joystickAngle = useStore(state => state.joystickAngle);

    /**
     * Default Controller Settings
     */

    const activateCameraTracking = useRef(false)

    /**
     * Character Initialization
     */

    const knightBody = useRef();
    const knightMesh = useRef();
    const knightAnimation = useRef(IDLE);

    // Character Model and animations loaders
    const knightModel = useGLTF("/models/character/character.glb");
    const knightAnimations = useAnimations(knightModel.animations, knightModel.scene);
    const knightSleeping = useRef(false);

    // Shadows initialization
    knightModel.scene.traverse((child) => {
        // Check if the child object is a Mesh
        if (child.isMesh && child.material.isMeshStandardMaterial) {
            child.castShadow = true;
        }
    });

    const pageVisibiliy = useRef(true)

    useEffect(() => {
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                pageVisibiliy.current = true;
                //   backgroundMusic.play();
            } else {
                pageVisibiliy.current = false;
                knightBody.current.sleep();
                //   backgroundMusic.pause();
            }
        });
    }, []);

    const [subscribeKeys, getKeys] = useKeyboardControls();

    // current character direction
    let direction;
    let knightPosition;

    useFrame((state, delta) => {

        /**
         * Camera Controller
         */
        direction = directionOffset(getKeys(), knightBody, activateCameraTracking);

        if (orbitControls || (knightSleeping && knightSleeping.current)) return;

        if (knightBody.current) {
            knightPosition = knightBody.current.translation();

            if (knightPosition.y < 0) {
                knightBody.current.setTranslation({
                    x: 0,
                    y: 1.5,
                    z: 0
                })
            }

            useStore.setState({ characterPosition: knightPosition });
            CAMERA_POSITION.addVectors(knightPosition, CAMERA_OFFSET);
            LERP_CAMERA_POSITION.lerp(CAMERA_POSITION, 5 * delta);

            if (activateCameraTracking.current) {
                state.camera.position.copy(LERP_CAMERA_POSITION); // A REACTIVER PÖUR SUIVRE PERSO
            }
            

            /**
             * Model Controller
             */
            // Update character velocity and orientation
            if (direction === null || !pageVisibiliy.current) {
                if (knightAnimation.current !== IDLE) {
                    knightAnimations.actions[knightAnimation.current].fadeOut(0.2);
                    knightAnimation.current = (IDLE);
                    knightAnimations.actions[knightAnimation.current].reset().fadeIn(0.2).play();
                }

                // knightBody.current.setLinvel({
                //     x: 0,
                //     y: knightBody.current.linvel().y,
                //     z: 0,
                // });
                updateCharacterLinvel(knightBody, direction, isMobile ? joystickAngle : null, 0, 0, 0);
                
                return;
            }

           if (knightAnimation.current !== RUN) {
                knightAnimations.actions[knightAnimation.current].fadeOut(0.2);
                knightAnimation.current = RUN;
                knightAnimations.actions[knightAnimation.current].reset().fadeIn(0.2).play();
            }
            // knightBody.current.setLinvel({
            //     x: SPEED * Math.cos(isMobile? joystickAngle : direction) * -1 /* * delta */,
            //     y: knightBody.current.linvel().y,
            //     z: SPEED * Math.sin(isMobile? joystickAngle : direction) /* * delta */,
            // });

            updateCharacterLinvel(knightBody, direction, isMobile ? joystickAngle : null);

            ROTATION_QUATERNION.setFromAxisAngle(ROTATION_EULER, direction - Math.PI / 2);
            knightMesh.current.quaternion.rotateTowards(ROTATION_QUATERNION, 0.3); //017 avant
        }
    });

    useEffect(() => {
        knightAnimations.actions[IDLE].fadeIn(0.2).play();
    }, []);

    return (
        <>
            <RigidBody
                type={"dynamic"}
                lockRotations
                ref={knightBody}
                colliders={false}
                position={[0, 1.5, 0]}
                // position={[-16, 5, -33]}
                onSleep={() => knightSleeping.current = true}
                onWake={() => knightSleeping.current = false}
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
            {/* <MobileController joystickAngle={joystickAngle} knightBody={knightBody} SPEED={SPEED} setKnightAnimation={setKnightAnimation}/> */}
        </>
    );
};

useGLTF.preload("/models/character/character.glb");

export default Player;
