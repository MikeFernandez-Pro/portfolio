import { useGLTF, Instances, Instance, Image, Box, useKeyboardControls, Float } from "@react-three/drei";
import { InstancedRigidBodies, RigidBody } from "@react-three/rapier";
import { useStore } from "./ZustandStorage";
import { extend, useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useControls } from "leva";
import gsap from "gsap";
import * as THREE from "three"


const IslandColliders = (props) => {

    const { nodes, materials } = useGLTF("/models/islandColliders/islandColliders.glb");
    const collidersPosition = useMemo(() => [-1.35, 2.3, -15], []);
    const collidersMaterial = useMemo(() => new THREE.MeshBasicMaterial({ visible: false }), [])

    const pressurePlatesGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
    const pressurePlatesMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "red" }), [])

    const activePlateRef = useRef(useStore.getState().activePlate)
    const magicCircleActivation = useStore(state => state.magicCircleActivation)

    const imgRef = useRef();

    const activeLink = useRef(null)

    const mailBoxRef = useRef()
    
    const imageLink = useControls('imageLink', {
        position: { value: { x: -4.47, y: 2.40, z: -7 }, step: 0.01 },
        rotationY: { value: 0 }
    })

    const activateLink = (link) => {
        if (link.id === "portal" && !activePlateRef.current)
            return;
        if (activeLink && !activeLink.current && imgRef.current) {
            activeLink.current = link;
            gsap.to(imgRef.current.scale, {x: link.textScale, y: link.textScale, z: link.textScale, duration: 0.3, ease: "back"})
            imgRef.current.position.set(...link.textPosition)
            imgRef.current.rotation.y = link.textRotationY;
        }
    }

    const deactivateLink = () => {
        if (activeLink && activeLink.current && imgRef.current) {
            activeLink.current = null;
            gsap.to(imgRef.current.scale, {x: 0, y: 0, z: 0, duration: 0.2})
        }
    }


    const activatePlate = (data) => {
        console.log("activated " + data.id)
        if (data.id === activePlateRef.current)
            return;

        useStore.setState(state => ({
            prevPlate: state.activePlate,
            activePlate: data.id
        }))
    }

    const linksInstancesDatas = [
        {
            key: "mailBox",
            userData: {
                id: "mailBox",
                textPosition: [-4.47, 2.45, -8.14],
                textRotationY: 0.40,
                textScale: 0.8,
                enterFunction: activateLink,
                exitFunction: deactivateLink,
            },
            position: [-4.24, 0.55, -8.07],
            rotation: [0, 0.49, 0],
            scale: [0.9, 0.9, 0.9],

        },
        {
            key: "linkedIn",
            userData: {
                id: "linkedIn",
                textPosition: [-3.37, 2.45, -8.63],
                textRotationY: 0.40,
                textScale: 0.8,
                href: "https://www.linkedin.com/in/mike-fernandez-front-end-dev/",
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
                id: "vercel",
                textPosition: [-2.26, 2.45, -9.27],
                textRotationY: 0.4,
                textScale: 0.8,
                href: "https://vercel.com/mikefernandez-pro",
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
                id: "portal",
                textPosition: [-16.79, 6.16, -36.86],
                textRotationY: 0,
                textScale: 1,
                href: {
                    portalPlate: "https://magic-portal-threejs.vercel.app/",
                    seaPlate: "https://raging-sea-shader-flame.vercel.app/",
                    galaxyPlate: "https://galaxy-generator-threejs-ten.vercel.app/"
                },
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
                id: "statue",
                textPosition: [-9.77, 8, -58.80],
                textRotationY: 0,
                textScale: 0.9,
                href: "https://www.google.fr/",
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
                id: "magicCircle",
                enterFunction: () => {
                    if (!magicCircleActivation)
                        useStore.setState({ magicCircleActivation: true })
                },
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
        scale: { value: [1, 1, 1], step: 0.01 },
        color: "red"
    })

    const box = useRef();



    useEffect(() => {
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                if (activeLink) {
                    activeLink.current.id === "mailBox" ?
                        window.location.href = 'mailto:mike.fernandez.pro@gmail.com' :
                        activeLink.current.id === "portal" ?
                            window.open(activeLink.current.href[activePlateRef.current], "_blank") :
                            window.open(activeLink.current.href, "_blank")
                }
            }
        })

        useStore.subscribe(
            state => (activePlateRef.current = state.activePlate)
        )

    }, []);

    // useStore.subscribe(state => ({ prevPlate: state.prevPlate, activePlate: state.activePlate }),
    //     (states) => {
    //         activePlateRef.current = states.activePlate;
    //         prevPlateRef.current = states.prevPlate;
    //     })

    return (
        <>
            <InstancedRigidBodies
                instances={instances}
                colliders="cuboid"
                type={"fixed"}
                sensor
                onIntersectionEnter={(state) =>
                    state.target.rigidBody.userData.enterFunction(state.target.rigidBody.userData)
                }
                onIntersectionExit={(state) => state.target.rigidBody.userData.exitFunction()}

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

            <Image
                ref={imgRef}
                url="/svg/Component 2.png"
                position={[imageLink.position.x, imageLink.position.y, imageLink.position.z]}
                rotation-y={imageLink.rotationY}
                scale={0.01}
                color={[3, 1.5, 1]}
                transparent
                toneMapped={false}
                onClick={() => {
                    if (activeLink) {
                    activeLink.current.id === "mailBox" ?
                        window.location.href = 'mailto:mike.fernandez.pro@gmail.com' :
                        activeLink.current.id === "portal" ?
                            window.open(activeLink.current.href[activePlateRef.current], "_blank") :
                            window.open(activeLink.current.href, "_blank")
                }
                }}
            />
        </>
    );
};

useGLTF.preload("/models/islandColliders/islandColliders.glb");

export default IslandColliders;
