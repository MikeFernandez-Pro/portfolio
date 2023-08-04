import { Circle } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef, useEffect } from "react";
import { CircleGeometry, Color, ShaderMaterial, MeshStandardMaterial, TextureLoader, Vector2, BoxGeometry, PlaneGeometry } from "three";
import { useStore } from "./ZustandStorage";
import gsap from "gsap";
import { useControls } from "leva";

import portalVertexShader from './shaders/portal/vertex.glsl'
import portalFragmentShader from './shaders/portal/fragment.glsl'


const ProjectsPortals = (props) => {

    /*Initalization */
    const seaPortalRef = useRef();
    const galaxyPortalRef = useRef();
    const portalPortalRef = useRef();

    const seaPortalTexture = useLoader(TextureLoader, "/textures/seaPortalTexture.jpg")
    const galaxyPortalTexture = useLoader(TextureLoader, "/textures/galaxyPortalTexture.jpg")

    const activePlate = useStore(state => state.activePlate)
    const prevPlate = useStore(state => state.prevPlate)

    const portalGeometry = useMemo(() => new CircleGeometry(0.8, 32), []);
    const portalsPosition = useMemo(() => [-16.1, 7, -37.7], []);

    const portalsDatas = {
        portalPlate: portalPortalRef,
        seaPlate: seaPortalRef,
        galaxyPlate: galaxyPortalRef
    }

    /**
     * Shader
     */


    const wellControls = useControls("Portals", {
        uColorStart: "#94c9e8",
        uColorEnd: "#68bcf8",
    });

    const customUniforms = {
        uTime: { value: 0 },
        uColorStart: { value: new Color(wellControls.uColorStart) },
        uColorEnd: { value: new Color(wellControls.uColorEnd) },
        uTextureMap: {value: seaPortalTexture}
    }

    const testMaterial = new ShaderMaterial({
        vertexShader: portalVertexShader,
        fragmentShader: portalFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uActivationTimer: {value: 0},
            uTextureMap: {value: seaPortalTexture}
        },
    })


    useFrame((state, delta) => {
        testMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    })


    /**
     * Animation
     */
    const portalAnimation = (portalAttribute, duration, values) => {
        gsap.to(portalAttribute, {
            duration: duration,
            x: values[0],
            y: values[1],
            z: values[2],
            ease: "power2.out"
        });
    }
    useEffect(() => {
        if (prevPlate && portalsDatas[prevPlate] && portalsDatas[prevPlate].current) {
            portalAnimation(portalsDatas[prevPlate].current.scale, 0.1, [0, 0, 0]);
        }
        if (activePlate && portalsDatas[activePlate] && portalsDatas[activePlate].current) {
            portalAnimation(portalsDatas[activePlate].current.scale, 0.2, [1, 1, 1]);
            gsap.to(testMaterial.uniforms.uActivationTimer, {duration: 1, value: 0.5})
        }
    }, [activePlate, prevPlate]);

    return (
        <>
            <mesh
                ref={seaPortalRef}
                geometry={portalGeometry}
                material={testMaterial}
                position={portalsPosition}
                scale={0}
            >
            </mesh>
            <mesh
                ref={galaxyPortalRef}
                geometry={portalGeometry}
                position={portalsPosition}
                scale={0}
            >
                <meshBasicMaterial map={seaPortalTexture} />
            </mesh>
            <mesh
                ref={portalPortalRef}
                geometry={portalGeometry}
                position={portalsPosition}
                scale={0}
            >
                <meshBasicMaterial map={galaxyPortalTexture} />
            </mesh>
        </>
    );
};

export default ProjectsPortals;