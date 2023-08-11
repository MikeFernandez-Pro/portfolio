import { useGLTF, useKeyboardControls, useAnimations } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody } from "@react-three/rapier";
import { useControls } from "leva";
import { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useStore } from "./ZustandStorage.jsx";

import MobileController from "./Controllers/MobileController.jsx";

const directionOffset = ({ forward, backward, leftward, rightward }, knightBody) => {
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
        speed: { value: 400, min: 100, max: 1000, step: 10 },
    });

    const islandMounted = useStore((state) => state.islandMounted);

    /**
     * Character Initialization
     */

    const knightBody = useRef();
    const knightMesh = useRef();

    // Character Model and animations loaders
    const knightModel = useGLTF("/models/KnightCharacter.gltf");
    const knightAnimations = useAnimations(knightModel.animations, knightModel.scene);

    // Animation Handler
    const [knightAnimation, setKnightAnimation] = useState("Idle");
    // Rigid Body current state 
    const [knightSleeping, setKnightSleeping] = useState(false);

    // Shadows initialization
    knightModel.scene.traverse((child) => {
        // Check if the child object is a Mesh
        if (child.isMesh && child.material.isMeshStandardMaterial) {
            // Set the sha<<w<<dowSide property to THREE.DoubleSide
            child.castShadow = true;
            //   child.receiveShadow = true;
        }
    });


    const { camera } = useThree();

    const [subscribeKeys, getKeys] = useKeyboardControls();

    // current character direction
    let direction;

    useFrame((state, delta) => {
        if (state.clock.elapsedTime > 5) setAnimate("dynamic");

        /**
         * Camera Controller
         */
        direction = directionOffset(getKeys(), knightBody);

        if (orbitControls || knightSleeping ) return;

        if (knightBody.current) {
            cameraPosition.addVectors(knightBody.current.translation(), cameraOffset);
            smoothCameraPosition.lerp(cameraPosition, 5 * delta);

            state.camera.position.copy(smoothCameraPosition); // A REACTIVER PÖUR SUIVRE PERSO

            /**
             * Model Controller
             */
            // Update character velocity and orientation
            if (direction === null || !islandMounted) {
                if (knightAnimation !== "Idle") setKnightAnimation("Idle");

                knightBody.current.setLinvel({
                    x: 0,
                    y: knightBody.current.linvel().y,
                    z: 0,
                });
                return;
            }

            if (knightAnimation !== "Run") setKnightAnimation("Run");

            knightBody.current.setLinvel({
                x: speed * delta * Math.cos(direction) * -1,
                y: knightBody.current.linvel().y,
                z: speed * delta * Math.sin(direction),
            });

            rotateQuaternion.setFromAxisAngle(rotationAngle, direction - Math.PI / 2);
            knightMesh.current.quaternion.rotateTowards(rotateQuaternion, 0.25); //017 avant
        }
    });

    useEffect(() => {
        knightAnimations.actions[knightAnimation].reset().fadeIn(0.2).play();

        return () => {
            knightAnimations.actions[knightAnimation].fadeOut(0.2);
        };
    }, [knightAnimation]);

    const [animate, setAnimate] = useState("fixed");

    return (
        <>
            <RigidBody
                type={animate}
                lockRotations
                ref={knightBody}
                colliders={false}
                position={[0, 4, 0]}
                // position={[-16, 5, -33]}
                onSleep={() => setKnightSleeping(true)}
                onWake={() => setKnightSleeping(false)}
            >
                <primitive
                    ref={knightMesh}
                    object={knightModel.scene}
                    scale={0.2}
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
