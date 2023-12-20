import { useMemo, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Circle } from "@react-three/drei";
import { ShaderMaterial, TextureLoader } from "three";
import { useStore } from "./ZustandStorage";
import gsap from "gsap";

import portalVertexShader from './shaders/portal/vertex.glsl'
import portalFragmentShader from './shaders/portal/fragment.glsl'

const PORTAL_PLATE_URL = "/textures/seaPortalTexture.png";
const SEA_PLATE_URL = "/textures/seaPortalTexture.jpg";
const HALLOWEEN_PLATE_URL = "/textures/halloweenPortalTexture2.png";

const ProjectsPortals = () => {

    /*Textures Initalization */
    const portalsTextures = useMemo(() => ({
        portalPlate: useLoader(TextureLoader, PORTAL_PLATE_URL),
        seaPlate: useLoader(TextureLoader, SEA_PLATE_URL),
        halloweenPlate: useLoader(TextureLoader, HALLOWEEN_PLATE_URL)
    }), []);

    /**
     * Shader Material Initalization
     */
    const portalShaderMaterial = useMemo(() => new ShaderMaterial({
        vertexShader: portalVertexShader,
        fragmentShader: portalFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uSize: { value: -0.2 },
            uTextureMap: { value: undefined }
        },
        transparent: true,
    }), []);
    
    // Retrieve changes and update shader texture accordingly
    const unsubActivaPlate = useStore.subscribe(
        (state) => state.activePlate,
        (activePlate) => {
            if (activePlate) {
                portalShaderMaterial.uniforms.uTextureMap.value = portalsTextures[activePlate]
                gsap.fromTo(portalShaderMaterial.uniforms.uSize, { value: 0 }, { duration: 0.8, value: 0.5 })
            }
        }
    )

    // Remove subscription on unmount
    useEffect(() => {
        return () => {
            unsubActivaPlate()
        }
    }, [])

    useFrame(({clock}) => 
        portalShaderMaterial.uniforms.uTime.value = clock.elapsedTime
    )

    return (
            <Circle
                args={[0.8, 32]}
                material={portalShaderMaterial}
                position={[-16.12, 7, -37.7]}
            />
    );
};

export default ProjectsPortals;