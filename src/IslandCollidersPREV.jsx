import { useGLTF, Instances, Instance, Image, Box } from "@react-three/drei";
import { InstancedRigidBodies, RigidBody } from "@react-three/rapier";
import { useStore } from "./ZustandStorage";
import { extend, useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useControls } from "leva";
import gsap from "gsap";
import * as THREE from "three"


const IslandColliders = (props) => {

    const { nodes, materials } = useGLTF("/models/collidersCollection.glb");
    const collidersPosition = useMemo(() => [-1.35, 2.3, -15], []);
    const collidersMaterial = useMemo(() => new THREE.MeshBasicMaterial({ visible: false }), [])

    const setActivePlate = useStore(state => state.setActivePlate)

    const pressurePlatesGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
    const pressurePlatesMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "red" }), [])

    const activePlateRef = useRef(useStore.getState().activePlate)
    const prevPlateRef = useRef(useStore.getState().prevPlate)

    const imgRef = useRef();

    const activeLink = useStore(state => state.activeLink)

    const mailBoxRef = useRef()

    const imageLink = useControls('imageLink', {
        position: { value: { x: -4.47, y: 2.40, z: -7 }, step: 0.01 },
        rotationY: { value: 0 }
    })

    const islandLinks = useMemo(() => ({

        mailBox: {
            position: [-4.47, 2.40, -8.14],
            rotationY: 0.26,
            scale: 0.8,
            link: ""
        },
        linkedIn: {
            position: [-3.68, 2.25, -8.50],
            rotationY: 0.26,
            scale: 0.8,
            link: ""
        },
        vercel: {
            position: [-2.62, 2.25, -9.06],
            rotationY: 0.26,
            scale: 0.8,
            link: ""
        },
        portal: {
            position: [-16.79, 6.16, -36.86],
            rotationY: 0,
            scale: 1,
            link: ""
        },
        statue: {
            position: [-10.08, 7.90, -58.80],
            rotationY: 0,
            scale: 0.9,
            link: ""
        }

    }), [])

    const activateLink = (link) => {
        if (!activeLink && imgRef.current) {
            useStore.setState({ activeLink: true })
            // imgRef.current.material.opacity = 1;
            gsap.to(imgRef.current.material, { opacity: 1, duration: 0.5 })
            imgRef.current.scale.set(link.textScale, link.textScale, link.textScale)
            imgRef.current.position.set(...link.textPosition)
            imgRef.current.rotation.y = link.textRotationY;
        }
    }

    const deactivateLink = () => {
        if (activeLink && imgRef.current) {
            useStore.setState({ activeLink: false })
            // imgRef.current.material.opacity = 0;
            gsap.to(imgRef.current.material, { opacity: 0, duration: 0.5 })
        }
    }

    const linksInstancesDatas = [
        {
            userData: {
                name: "mailBox",
                textPosition: [-4.47, 2.40, -8.14],
                textRotationY: 0.26,
                textScale: 0.8,
                link: ""
            },
            position: [-4.24, 0.5, -8.07],
            rotation: [0, 0.49, 0],
            scale: [1, 1, 1],

        },
        {
            userData: {
                name: "linkedIn",
                textPosition: [-3.68, 2.25, -8.50],
                textRotationY: 0.26,
                textScale: 0.8,
                link: ""
            },
            position: [-3.11, 0.5, -8.64],
            rotation: [0, 0.49, 0],
            scale: [1, 1, 1],
        },
        {
            userData: {
                name: "vercel",
                textPosition: [-2.62, 2.25, -9.06],
                textRotationY: 0.26,
                textScale: 0.8,
                link: ""
            },
            position: [-2.03, 0.5, -9.20],
            rotation: [0, 0.48, 0],
            scale: [1, 1, 1],
        },
        {
            userData: {
                name: "portal",
                textPosition: [-16.79, 6.16, -36.86],
                textRotationY: 0,
                textScale: 1,
                link: ""
            },
            position: [-16.11, 4.80, -36.71],
            rotation: [0.43, 0, 0],
            scale: [1.41, 0.95, 3],
        },
        {
            userData: {
                name: "statue",
                textPosition: [-10.08, 7.90, -58.80],
                textRotationY: 0,
                textScale: 0.9,
                link: ""
            },
            position: [-9.76, 6.43, -58.20],
            rotation: [0, 0, 0],
            scale: [2, 2, 2],
        },
    ]

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
        position: { value: [-2.03, 0.42, -9.20], step: 0.01 },
        rotation: { value: [0, 0, 0], step: 0.01 },
        scale: { value: [0.9, 1, 0.9], step: 0.01 },
    })

    const box = useRef();


    return (
        <>
            <Box ref={box}
                // ²
                position={instanceControls.position}
                rotation={instanceControls.rotation}
                scale={instanceControls.scale}
            />

            <InstancedRigidBodies
                instances={instances}
                colliders="cuboid"
                type={"fixed"}
                sensor
                onIntersectionEnter={(state) => {
                    activateLink(state.target.rigidBody.userData)
                }}
                onIntersectionExit={() => deactivateLink()}
            >
                <instancedMesh args={[null, null, linksInstancesDatas.length]}>
                    <boxGeometry args={[0.7, 1, 0.7]} />
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

            <RigidBody
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
            </RigidBody>

            <RigidBody
                type={"fixed"}
                colliders={"cuboid"}
                onCollisionEnter={() => {
                    useStore.setState(state => ({
                        prevPlate: state.activePlate,
                        activePlate: "portalPlate"
                    }))
                }}
                position={[-15.085, 4.4, -32.45]}
            >
                <mesh
                    scale={0.95}
                    geometry={pressurePlatesGeometry}
                    material={collidersMaterial}
                />
            </RigidBody>
            <RigidBody
                type={"fixed"}
                colliders={"cuboid"}
                onCollisionEnter={() => {
                    useStore.setState(state => ({
                        prevPlate: state.activePlate,
                        activePlate: "seaPlate"
                    }))
                }}
                position={[-15.085, 4.4, -34.495]}
            >
                <mesh
                    scale={0.95}
                    geometry={pressurePlatesGeometry}
                    material={collidersMaterial}
                />
            </RigidBody>
            <RigidBody
                type={"fixed"}
                colliders={"cuboid"}
                onCollisionEnter={() => {
                    useStore.setState(state => ({
                        prevPlate: state.activePlate,
                        activePlate: "galaxyPlate"
                    }))
                }}
                position={[-17.14, 4.4, -34.495]}
            >
                <mesh
                    scale={0.95}
                    geometry={pressurePlatesGeometry}
                    material={collidersMaterial}
                />
            </RigidBody>

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

            {/* <RigidBody
                type={"fixed"}
                colliders={"cuboid"}
                sensor
                onIntersectionEnter={() => activateLink(islandLinks.statue)}
                onIntersectionExit={() => deactivateLink()}
            >
                <mesh
                    scale={0.45}
                    position={collidersPosition}
                    geometry={nodes.statue.geometry}
                    material={collidersMaterial}
                />
            </RigidBody> */}

            <Image
                ref={imgRef}
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
