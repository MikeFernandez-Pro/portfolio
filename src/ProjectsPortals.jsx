import { useMemo, useRef, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Circle } from "@react-three/drei";
import { ShaderMaterial, TextureLoader } from "three";
import { useStore } from "./ZustandStorage";
import gsap from "gsap";

import portalVertexShader from './shaders/portal/vertex.glsl'
import portalFragmentShader from './shaders/portal/fragment.glsl'

const ProjectsPortals = (props) => {

    /*Initalization */
    const portalRef = useRef();

    const portalsTextures = useMemo(() => ({
        portalPlate: useLoader(TextureLoader, "/textures/seaPortalTexture.png"),
        seaPlate: useLoader(TextureLoader, "/textures/seaPortalTexture.jpg"),
        galaxyPlate: useLoader(TextureLoader, "/textures/galaxyPortalTexture.jpg")
    }), []);

    const activePlate = useStore(state => state.activePlate)

    /**
     * Shader
     */
    const portalMaterial = useMemo(() => new ShaderMaterial({
        vertexShader: portalVertexShader,
        fragmentShader: portalFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uActivationTimer: { value: 0 },
            uTextureMap: { value: null }
        },
    }), []);

    /**
     * Animation
     */
    useFrame((state) => {
        portalMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    })
    
    useEffect(() => {
        if (activePlate) {
            portalMaterial.uniforms.uActivationTimer.value = 0;
            portalMaterial.uniforms.uTextureMap.value = portalsTextures[activePlate]
            gsap.to(portalMaterial.uniforms.uActivationTimer, {duration: 0.8, value: 0.5})
        }
        }, [activePlate]);

    return (
        <>
            <Circle
                ref={portalRef}
                args={[0.8, 32]}
                material={portalMaterial}
                position={[-16.12, 7, -37.7]}
            />
        </>
    );
};

export default ProjectsPortals;