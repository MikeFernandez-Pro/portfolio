import { useGLTF, Instances, Instance, Image, Box } from "@react-three/drei";
import { InstancedRigidBodies, RigidBody } from "@react-three/rapier";
import { useStore } from "./ZustandStorage";
import { extend, useFrame, useLoader } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useControls } from "leva";
import gsap from "gsap";
import * as THREE from "three"



const IslandColliders = (props) => {

    const { nodes, materials } = useGLTF("/models/collidersCollection.glb");
    const collidersPosition = useMemo(() => [-1.35, 2.3, -15], []);
    const collidersMaterial = useMemo(() => new THREE.MeshBasicMaterial({ visible: false }), [])

    const pressurePlatesGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
    const pressurePlatesMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "red" }), [])

    const activePlateRef = useRef(useStore.getState().activePlate)
    const prevPlateRef = useRef(useStore.getState().prevPlate)

    const actionIndicatorRef = useRef();

    const activeLink = useStore(state => state.activeLink)

    const mailBoxRef = useRef()

    const imageLink = useControls('imageLink', {
        position: { value: { x: -4.47, y: 2.40, z: -7 }, step: 0.01 },
        rotationY: { value: 0 }
    })

    const activateLink = useCallback((data) => {
        console.log("enter")
        if (!activeLink && actionIndicatorRef.current) {            
            useStore.setState({ activeLink: true })
            // actionIndicatorRef.current.material.opacity = 1;
            gsap.to(actionIndicatorRef.current.material, { opacity: 1, duration: 0.5 })
            actionIndicatorRef.current.scale.set(data.textScale, data.textScale, data.textScale)
            actionIndicatorRef.current.position.set(...data.textPosition)
            actionIndicatorRef.current.rotation.y = data.textRotationY;
        }
    }, [])

    const deactivateLink = useCallback(() => {
        console.log("here")
        if (activeLink && actionIndicatorRef.current) {
            useStore.setState({ activeLink: false })
            // actionIndicatorRef.current.material.opacity = 0;
            gsap.to(actionIndicatorRef.current.material, { opacity: 0, duration: 0.5 })
        }
    }, [])

    const activatePlate = useCallback((data) => {
        useStore.setState(state => ({
            prevPlate: state.activePlate,
            activePlate: data.id
        }))
    }, []);

    /*
    *  INSTANCES INITIALIZATION
    */

    const linksInstancesDatas = useMemo(() => [
        {
            key: "mailBox",
            userData: {
                textPosition: [-4.47, 2.40, -8.14],
                textRotationY: 0.26,
                textScale: 0.8,
                link: "",
                enterFunction: activateLink,
                exitFunction: deactivateLink,
            },
            position: [-4.24, 0.5, -8.07],
            rotation: [0, 0.49, 0],
            scale: [0.9, 0.9, 0.9],

        },
        {
            key: "linkedIn",
            userData: {
                textPosition: [-3.68, 2.25, -8.50],
                textRotationY: 0.26,
                textScale: 0.8,
                link: "",
                enterFunction: activateLink,
                exitFunction: deactivateLink,
            },
            position: [-3.11, 0.5, -8.64],
            rotation: [0, 0.49, 0],
            scale: [0.9, 0.9, 0.9],
        },
        {
            key: "vercel",
            userData: {
                textPosition: [-2.62, 2.25, -9.06],
                textRotationY: 0.26,
                textScale: 0.8,
                link: "",
                enterFunction: activateLink,
                exitFunction: deactivateLink,
            },
            position: [-2.03, 0.5, -9.20],
            rotation: [0, 0.48, 0],
            scale: [0.9, 0.9, 0.9],
        },
        {
            key: "portal",
            userData: {
                textPosition: [-16.79, 6.16, -36.86],
                textRotationY: 0,
                textScale: 1,
                link: "",
                enterFunction: activateLink,
                exitFunction: deactivateLink,
            },
            position: [-16.10, 5.24, -37.49],
            rotation: [0.43, 0, 0],
            scale: [1.04, 0.97, 3],
        },
        {
            key: "statue",
            userData: {
                textPosition: [-10.08, 7.90, -58.80],
                textRotationY: 0,
                textScale: 0.9,
                link: "",
                enterFunction: activateLink,
                exitFunction: deactivateLink,
            },
            position: [-9.76, 6.43, -58.20],
            rotation: [0, 0, 0],
            scale: [1.5, 1, 1.5],
        },
        {
            key: "magicCircle",
            userData: {
                enterFunction: () => useStore.setState({ magicCircleActivation: true }),
            },
            position: [6.34, 2.69, -33.53],
            rotation: [0, -0.15, 0],
            scale: [2.85, 0.35, 2.85],
        },
        {
            key: "portalPlate",
            userData: {
                id: "portalPlate",
                enterFunction: activatePlate,
            },
            position: [-15.085, 4.4, -32.45],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
        },
        {
            key: "seaPlate",
            userData: {
                id: "seaPlate",
                enterFunction: activatePlate
            },
            position: [-15.085, 4.4, -34.495],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
        },
        {
            key: "galaxyPlate",
            userData: {
                id: "galaxyPlate",
                enterFunction: activatePlate
            },
            position: [-17.14, 4.4, -34.495],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
        },
    ], []);

    const instances = useMemo(() => {
        const instances = new Array(linksInstancesDatas.length);

        for (let i = 0; i < linksInstancesDatas.length; i++) {
            instances[i] = {
                key: "instance_" + i,
                ...linksInstancesDatas[i]
            };
        }
        return instances;
    }, []);


    const instanceControls = useControls("instance", {
        position: { value: [-16.11, 4.80, -36.71], step: 0.01 },
        rotation: { value: [0.43, 0, 0], step: 0.01 },
        scale: { value: [1.41, 0.95, 3], step: 0.01 },
    })

    const box = useRef();


    return (
        <>
            <Box ref={box}
                position={instanceControls.position}
                rotation={instanceControls.rotation}
                scale={instanceControls.scale}
            />

            <InstancedRigidBodies
                instances={instances}
                colliders="cuboid"
                type={"fixed"}
                sensor
                onIntersectionEnter={(state) =>
                    state.target.rigidBody.userData.enterFunction(state.target.rigidBody.userData)
                }
                onIntersectionExit={() => state.target.rigidBody.userData.exitFunction()}
            >
                <instancedMesh args={[null, null, linksInstancesDatas.length]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial transparent opacity={0} />
                </instancedMesh>
            </InstancedRigidBodies>

            <RigidBody type={"fixed"} colliders={"trimesh"}>
                <mesh
                    scale={0.45}
                    position={collidersPosition}
                    geometry={nodes.Collider.geometry}
                    material={collidersMaterial}
                />
            </RigidBody>

            {/* <RigidBody
                type={"fixed"}
                colliders={"hull"}
                onCollisionEnter={() => {
                    useStore.setState({ magicCircleActivation: true })
                }}
            >
                <mesh
                    scale={0.45}
                    position={collidersPosition}
                    geometry={nodes.magicCircle.geometry}
                    material={collidersMaterial}
                />
            </RigidBody> */}


            <RigidBody
                type={"fixed"}
                colliders={"hull"}
            >
                <mesh
                    scale={0.45}
                    position={collidersPosition}
                    geometry={nodes.portal.geometry}
                    material={collidersMaterial}
                />
            </RigidBody>

            <Image
                ref={actionIndicatorRef}
                url="/svg/Component 2.png"
                position={[imageLink.position.x, imageLink.position.y, imageLink.position.z]}
                rotation-y={0}
                scale={2}
                color={[3, 1.5, 1]}
                transparent
                toneMapped={false}
                opacity={0}
            />
        </>
    );
};

useGLTF.preload("/models/IslandCollider.glb");

export default IslandColliders;
