import { useGLTF, Instances, Instance, Image, Box, useKeyboardControls, Float } from "@react-three/drei";
import { InstancedRigidBodies, RigidBody } from "@react-three/rapier";
import { useStore } from "./ZustandStorage";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useControls } from "leva";
import gsap from "gsap";

const INTERACTION_PROMPT_URL = "/textures/Enter.webp"

// Sensor Colliders IDs:
const MAIL_BOX_ID = "mailBox";
const LINKED_IN_ID = "linkedIn";
const VERCEL_ID = "vercel";
const PORTAL_ID = "portal";
const STATUE_ID = "statue";
const MAGIC_GLYPH_ID = "magicGlyph";
const PORTAL_PLATE_ID = "portalPlate";
const SEA_PLATE_ID = "seaPlate";
const HALLOWEEN_PLATE_ID = "halloweenPlate";

// Sensor Colliders URLs:
const LINKED_IN_URL = "https://www.linkedin.com/in/mike-fernandez-front-end-dev/";
const VERCEL_URL = "https://vercel.com/mikefernandez-pro";
const PORTAL_PLATE_URL = "https://magic-portal-threejs.vercel.app/";
const SEA_PLATE_URL = "https://raging-sea-shader-flame.vercel.app/";
const HALLOWEEN_PLATE_URL = "https://halloween-challenge.vercel.app/";
const STATUE_URL = "/CV_Portfolio_Mike.pdf";

const IslandColliders = () => {

    const { nodes } = useMemo(() => useGLTF("/models/islandColliders/islandColliders.glb"), [])

    const activePlateRef = useRef(useStore.getState().activePlate)
    const magicGlyphActivation = useStore(state => state.magicGlyphActivation)

    const interactionPromptRef = useRef();

    const activeLink = useRef()

    const isMobile = useStore(state => state.isMobile)

    const activateLink = useCallback((link) => {
        if (link.id === "portal" && !activePlateRef.current)
            return;
        if (activeLink && !activeLink.current && interactionPromptRef.current) {
            activeLink.current = link;
            gsap.to(interactionPromptRef.current.scale, { x: link.textScale, y: link.textScale, z: link.textScale, duration: 0.3, ease: "back" })
            interactionPromptRef.current.position.set(...link.textPosition)
            interactionPromptRef.current.rotation.y = link.textRotationY;
        }
    }, [])

    const deactivateLink = useCallback(() => {
        if (activeLink && activeLink.current && interactionPromptRef.current) {
            activeLink.current = undefined;
            gsap.to(interactionPromptRef.current.scale, { x: 0, y: 0, z: 0, duration: 0.2 })
        }
    }, [])


    const activatePlate = useCallback((userData) => {
        if (userData.id === activePlateRef.current)
            return;

        useStore.setState(state => ({
            activePlate: userData.id
        }))
    }, []);

    const linksInstancesDatas = useMemo(() => [
        {
            key: MAIL_BOX_ID,
            userData: {
                id: MAIL_BOX_ID,
                textPosition: [-4.47, 2.45, -8.14],
                textRotationY: 0.40,
                textScale: 0.8,
                startInteraction: activateLink,
                closeInteraction: deactivateLink,
            },
            position: [-4.24, 0.55, -8.07],
            rotation: [0, 0.49, 0],
            scale: [0.9, 0.9, 0.9],

        },
        {
            key: LINKED_IN_ID,
            userData: {
                id: LINKED_IN_ID,
                textPosition: [-3.37, 2.45, -8.63],
                textRotationY: 0.40,
                textScale: 0.8,
                href: LINKED_IN_URL ,
                startInteraction: activateLink,
                closeInteraction: deactivateLink,
            },
            position: [-3.11, 0.5, -8.64],
            rotation: [0, 0.49, 0],
            scale: [0.9, 0.9, 0.9],
        },
        {
            key: VERCEL_ID,
            userData: {
                id: VERCEL_ID,
                textPosition: [-2.26, 2.45, -9.27],
                textRotationY: 0.4,
                textScale: 0.8,
                href:  VERCEL_URL,
                startInteraction: activateLink,
                closeInteraction: deactivateLink,
            },
            position: [-2.03, 0.5, -9.20],
            rotation: [0, 0.48, 0],
            scale: [0.9, 0.9, 0.9],
        },
        {
            key: PORTAL_ID,
            userData: {
                id: PORTAL_ID,
                textPosition: [-16.79, 6.16, -36.86],
                textRotationY: 0,
                textScale: 1,
                href: {
                    portalPlate: PORTAL_PLATE_URL,
                    seaPlate: SEA_PLATE_URL,
                    halloweenPlate: HALLOWEEN_PLATE_URL,
                },
                startInteraction: activateLink,
                closeInteraction: deactivateLink,
            },
            position: [-16.10, 5.24, -37.49],
            rotation: [0.43, 0, 0],
            scale: [1.04, 0.97, 3],
        },
        {
            key: STATUE_ID,
            userData: {
                id: STATUE_ID,
                textPosition: [-9.77, 8, -58.80],
                textRotationY: 0,
                textScale: 0.9,
                href: STATUE_URL,
                startInteraction: activateLink,
                closeInteraction: deactivateLink,
            },
            position: [-9.76, 6.43, -58.20],
            rotation: [0, 0, 0],
            scale: [1.5, 1, 1.5],
        },
        {
            key: MAGIC_GLYPH_ID,
            userData: {
                id: MAGIC_GLYPH_ID,
                startInteraction: () => {
                    if (!magicGlyphActivation)
                        useStore.setState({ magicGlyphActivation: true })
                },
            },
            position: [6.34, 2.69, -33.53],
            rotation: [0, -0.15, 0],
            scale: [2.85, 0.35, 2.85],
        },
        {
            key: PORTAL_PLATE_ID,
            userData: {
                id: PORTAL_PLATE_ID,
                startInteraction: activatePlate,
            },
            position: [-15.085, 4.4, -32.45],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
        },
        {
            key: SEA_PLATE_ID,
            userData: {
                id: SEA_PLATE_ID,
                startInteraction: activatePlate
            },
            position: [-15.085, 4.4, -34.495],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
        },
        {
            key: HALLOWEEN_PLATE_ID,
            userData: {
                id: HALLOWEEN_PLATE_ID,
                startInteraction: activatePlate
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

    const startInteraction = useCallback((event) => {
        if (event.key === 'Enter') {
            if (activeLink) {
                activeLink.current.id === "mailBox" ?
                    window.location.href = 'mailto:mike.fernandez.pro@gmail.com' :
                    activeLink.current.id === "portal" ?
                        window.open(activeLink.current.href[activePlateRef.current], "_blank") :
                        window.open(activeLink.current.href, "_blank")
            }
        }
    }, [])

    useEffect(() => {
        nodes.Collider.material.visible = false;
        window.addEventListener('keydown', startInteraction)

        const unsubActivaPlate = useStore.subscribe(
            state => (activePlateRef.current = state.activePlate)
        )

        return () => {
            window.removeEventListener('keydown', startInteraction)
            unsubActivaPlate();
        }
    }, []);

    return (
        <>
            <InstancedRigidBodies
                instances={instances}
                colliders="cuboid"
                type={"fixed"}
                sensor
                onIntersectionEnter={(state) =>
                    state.target.rigidBody.userData.startInteraction(state.target.rigidBody.userData)
                }
                onIntersectionExit={(state) => state.target.rigidBody.userData.closeInteraction()}

            >
                <instancedMesh
                    args={[undefined, undefined, linksInstancesDatas.length]}
                    material={nodes.Collider.material}
                >
                    <boxGeometry args={[1, 1, 1]} />
                </instancedMesh>
            </InstancedRigidBodies>

            <RigidBody type={"fixed"} colliders={"trimesh"}>
                <mesh
                    scale={0.45}
                    position={[-1.35, 2.3, -15]}
                    geometry={nodes.Collider.geometry}
                    material={nodes.Collider.material}
                />
            </RigidBody>

            <Image
                ref={interactionPromptRef}
                url={INTERACTION_PROMPT_URL}
                scale={0.01}
                color={[3, 1.5, 1]}
                transparent
                toneMapped={false}
                onClick={() => {
                    if (activeLink && isMobile) {
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
