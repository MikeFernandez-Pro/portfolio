import { useGLTF, useKeyboardControls, useAnimations, ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import { useControls } from "leva";
import { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useStore } from "./ZustandStorage.jsx";

import MobileController from "./Controllers/MobileController.jsx";

const directionOffset = ({ forward, backward, leftward, rightward }, knightBody) => {

    // if (enter) 
    //     window.open("https://www.google.fr/", "_blank")

    if (!forward && !backward && !leftward && !rightward) return null;

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

const Player = ({ joystickAngle, orbitControls }) => {
    /**
     * Default Controller Settings
     */
    const rotationAngle = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    const rotateQuaternion = useMemo(() => new THREE.Quaternion(), []);
    const cameraPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);
    const cameraOffset = useMemo(() => new THREE.Vector3(0, 4, 5.5), []);
    const smoothCameraPosition = useMemo(() => new THREE.Vector3(0, 0, 0), []);

    // Character movement speed Controller
    const { speed } = useControls("Character", {
        speed: { value: 4.5, min: 0, max: 500, step: 10 },
    });

    /**
     * Character Initialization
     */

    const knightBody = useRef();
    const knightMesh = useRef();
    const knightAnimation = useRef("Idle");

    // Character Model and animations loaders
    const knightModel = useGLTF("/models/KnightCharacter.gltf");
    const knightAnimations = useAnimations(knightModel.animations, knightModel.scene);

    // Animation Handler
    // const [knightAnimation, setKnightAnimation] = useState("Idle");
    // Rigid Body current state 
    const knightSleeping = useRef(false);

    // // Shadows initialization
    // knightModel.scene.traverse((child) => {
    //     // Check if the child object is a Mesh
    //     if (child.isMesh && child.material.isMeshStandardMaterial) {
    //         // Set the sha<<w<<dowSide property to THREE.DoubleSide
    //         // child.castShadow = true;
    //         //   child.receiveShadow = true;
    //     }
    // });




    // CLAMP DELTA TO AVOID FRAMES BUG WHEN GO BACK TO WEBSITE TAB
    // const clampedDelta = Math.min(delta, 1/30) 


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

    const { camera } = useThree();

    const [subscribeKeys, getKeys] = useKeyboardControls();

    // current character direction
    let direction;
    let knightPosition;


    useFrame((state, delta) => {


        /**
         * Camera Controller
         */
        direction = directionOffset(getKeys(), knightBody);

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


            cameraPosition.addVectors(knightPosition, cameraOffset);
            smoothCameraPosition.lerp(cameraPosition, 5 * delta);

            // state.camera.position.copy(smoothCameraPosition); // A REACTIVER PÖUR SUIVRE PERSO

            /**
             * Model Controller
             */
            // Update character velocity and orientation
            if (direction === null || !pageVisibiliy.current) {
                if (knightAnimation.current !== "Idle") {
                    knightAnimations.actions[knightAnimation.current].fadeOut(0.2);
                    knightAnimation.current = ("Idle");
                    knightAnimations.actions[knightAnimation.current].reset().fadeIn(0.2).play();
                }

                knightBody.current.setLinvel({
                    x: 0,
                    y: knightBody.current.linvel().y,
                    z: 0,
                });
                return;
            }

            if (knightAnimation.current !== "Run") {
                knightAnimations.actions[knightAnimation.current].fadeOut(0.2);
                knightAnimation.current = "Run";
                knightAnimations.actions[knightAnimation.current].reset().fadeIn(0.2).play();
            }

            knightBody.current.setLinvel({
                x: speed * Math.cos(direction) * -1 /* * delta */,
                y: knightBody.current.linvel().y,
                z: speed * Math.sin(direction) /* * delta */,
            });

            rotateQuaternion.setFromAxisAngle(rotationAngle, direction - Math.PI / 2);
            knightMesh.current.quaternion.rotateTowards(rotateQuaternion, 0.3); //017 avant
        }
    });

    useEffect(() => {
        knightAnimations.actions["Idle"].fadeIn(0.2).play();
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
            {/* <MobileController joystickAngle={joystickAngle} knightBody={knightBody} speed={speed} setKnightAnimation={setKnightAnimation}/> */}
        </>
    );
};

useGLTF.preload("/models/KnightCharacter.gltf");

export default Player;
