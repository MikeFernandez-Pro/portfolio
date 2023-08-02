import { Circle } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { useMemo, useRef, useEffect } from "react";
import { TextureLoader, Vector2 } from "three";
import { useStore } from "./ZustandStorage";
import gsap from "gsap";


const ProjectsPortals = (props) => {

    const seaPortalTexture = useLoader(TextureLoader, "/textures/seaPortalTexture.jpg")
    const galaxyPortalTexture = useLoader(TextureLoader, "/textures/galaxyPortalTexture.jpg")

    const activePlate = useStore(state => state.activePlate)

    const seaPortalRef = useRef();
    const galaxyPortalRef = useRef();
    const portalPortalRef = useRef();

    const portalsDatas = [
        {ref: portalPortalRef, name: "portalPlate"},
        {seaPortalRef, name: "seaPlate"},
        {galaxyPortalRef, name: "galaxyPlate"}
    ]

    const updatePortal = (portal, duration, scale) => {
        if (portal && portal.current) {
            gsap.to(portal.current.scale, {
                duration: duration,       // Animation duration in seconds
                x: scale,              // Scale factor in the x-direction
                y: scale,            // Scale factor in the y-direction
                z: scale,            // Scale factor in the z-direction
                ease: "power2.out" // Easing function
              });
        }
    };  


    const updateActivePortal = () => {
        for (const portal of portalsDatas) {
            if (activePlate === portal.name) {
                updatePortal(portal.ref, 0.5, 3);
            } else {
                updatePortal(portal.ref, 0.2, 0);
            }
        }
    };


    useEffect(() => {
        updateActivePortal();
    }, [activePlate]);

    return (
        <>
            <Circle
                ref={seaPortalRef}
                args={[0.8, 64]}
                position={[-16.1, 7, -37.7]}
                scale={0}
            >
                <meshBasicMaterial map={seaPortalTexture} />
            </Circle>
            <Circle
                ref={galaxyPortalRef}
                args={[0.8, 64]}
                position={[-16.1, 7, -37.7]}
                scale={0}
            >
                <meshBasicMaterial map={galaxyPortalTexture} />
            </Circle>
            <Circle
                ref={portalPortalRef}
                args={[0.8, 64]}
                position={[-16.1, 7, -37.7]}
                scale={0}
            >
                <meshBasicMaterial map={galaxyPortalTexture} />
            </Circle>
        </>
    );
};

export default ProjectsPortals;