import { useMemo, useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Circle } from "@react-three/drei";
import { useStore } from "./ZustandStorage";
import gsap from "gsap";
import * as THREE from "three";

import portalVertexShader from './shaders/portal/vertex.glsl'
import portalFragmentShader from './shaders/portal/fragment.glsl'


const PORTAL_PLATE_URL = "/textures/portalPortalTexture.webp";
const SEA_PLATE_URL = "/textures/seaPortalTexture.webp";
const HALLOWEEN_PLATE_URL = "/textures/halloweenPortalTexture.webp";

const PORTAL_POSITION = new THREE.Vector3(-16.12, 6.95, -37.7)




const ProjectsPortals = () => {

    const portalActivationRef = useRef(false);

    const isMobile = useStore(state => state.isMobile);

    const portalSoundEffect = useMemo(() =>
        isMobile ? undefined : (() => {
            const audio = new Audio("sounds/portalSoundEffect.mp3");
            audio.loop = true;
            return audio;
        })(), []);

    /*Textures Initalization */
    const portalsTextures = useMemo(() => ({
        portalPlate: useLoader(THREE.TextureLoader, PORTAL_PLATE_URL),
        seaPlate: useLoader(THREE.TextureLoader, SEA_PLATE_URL),
        halloweenPlate: useLoader(THREE.TextureLoader, HALLOWEEN_PLATE_URL)
    }), []);

    /**
     * Shader Material Initalization
     */
    const portalShaderMaterial = useMemo(() => new THREE.ShaderMaterial({
        vertexShader: portalVertexShader,
        fragmentShader: portalFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uSize: { value: -0.2 },
            uTextureMap: { value: undefined },
            uContrast: { value: 1.52 },
            uLightIntensity: { value: 0.61 },
        },
        transparent: true,
        toneMapped: false,
    }), []);


    useEffect(() => {
        // Retrieve current activated plate and update shader texture accordingly
        const unsubActivaPlate = useStore.subscribe(
            (state) => state.activePlate,
            (activePlate) => {
                if (activePlate) {
                    portalShaderMaterial.uniforms.uTextureMap.value = portalsTextures[activePlate]
                    gsap.fromTo(portalShaderMaterial.uniforms.uSize, { value: 0 }, { duration: 0.5, value: 0.5 })
                    // Activate Portal Sound Effect Only Once
                    if (!portalActivationRef.current) {
                        portalSoundEffect?.play();
                        portalActivationRef.current = true;
                    }
                }
            }
        )

        // Update portal sound effect volume based on character position
        const unsubCharacterPosition = isMobile ? undefined : useStore.subscribe(
            state => state.characterPosition,
            (characterPosition) => {
                if (characterPosition) {
                    portalSoundEffect.volume = PORTAL_POSITION.distanceTo(characterPosition) < 13 ?
                        Math.min(((1 / PORTAL_POSITION.distanceTo(characterPosition))) * 2, 0.8)
                        : 0;
                }
            }
        )

        // Remove subscriptions on unmount
        return () => {
            unsubActivaPlate()
            typeof(unsubCharacterPosition) === "function" ? unsubCharacterPosition() : null;
        }
    }, [])

    useFrame(({ clock }) => {
        portalShaderMaterial.uniforms.uTime.value = clock.elapsedTime
    })

    return (
        <Circle
            args={[0.8, 32]}
            material={portalShaderMaterial}
            position={[-16.12, 6.95, -37.7]}
        />
    );
};

export default ProjectsPortals;