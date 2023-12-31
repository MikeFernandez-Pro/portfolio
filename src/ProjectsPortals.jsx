import { useMemo, useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Circle } from "@react-three/drei";
import { useStore } from "./ZustandStorage";
import gsap from "gsap";
import * as THREE from "three";

import portalVertexShader from './shaders/portal/vertex.glsl'
import portalFragmentShader from './shaders/portal/fragment.glsl'

import { useControls } from "leva";

const PORTAL_PLATE_URL = "/textures/portalPortalTexture.webp";
const SEA_PLATE_URL = "/textures/seaPortalTexture.webp";
const HALLOWEEN_PLATE_URL = "/textures/halloweenPortalTexture.webp";

const ProjectsPortals = () => {

    const portalActivationRef = useRef(false);

    const controls = useControls("magicPortal", {
        uContrast: { value: 1.52, min: 0, max: 2, step: 0.001 },
        uLightIntensity: { value: 0.61, min: 0, max: 1.5, step: 0.001 }
    })

    const portalPosition = useMemo(() => new THREE.Vector3(-16.12, 6.95, -37.7, []))
    const portalSoundEffect = useMemo(() => {
        const soundEffect = new Audio("sounds/portalSoundEffect2.mp3");
        soundEffect.loop = true;
        return soundEffect;
    }, [])

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
            uContrast: { value: controls.uContrast },
            uLightIntensity: { value: controls.uLightIntensity },
        },
        transparent: true,
        toneMapped: false,
    }), []);


    useEffect(() => {
        // Retrieve changes and update shader texture accordingly
        const unsubActivaPlate = useStore.subscribe(
            (state) => state.activePlate,
            (activePlate) => {
                if (activePlate) {
                    portalShaderMaterial.uniforms.uTextureMap.value = portalsTextures[activePlate]
                    gsap.fromTo(portalShaderMaterial.uniforms.uSize, { value: 0 }, { duration: 0.5, value: 0.5 })
                    // Activate Portal Sound Effect Only Once
                    if (!portalActivationRef.current) {
                        portalSoundEffect.play();
                        portalActivationRef.current = true;
                    }
                }
            }
    )

    const unsubCharacterPosition = useStore.subscribe(
        state => state.characterPosition,
        (characterPosition) => {
            if (characterPosition) {
                console.log(`volume: ${portalSoundEffect.volume}, distance: ${portalPosition.distanceTo(characterPosition)}`)
                portalSoundEffect.volume = portalPosition.distanceTo(characterPosition) < 13 ?
                    Math.min(((1 / portalPosition.distanceTo(characterPosition))) * 2, 0.8)
                    : 0;
            }
        }
    )

    // Remove subscription on unmount
    return () => {
        unsubActivaPlate()
        unsubCharacterPosition();
    }
}, [])

    useFrame(({ clock }) => {
        portalShaderMaterial.uniforms.uTime.value = clock.elapsedTime
        portalShaderMaterial.uniforms.uContrast.value = controls.uContrast
        portalShaderMaterial.uniforms.uLightIntensity.value = controls.uLightIntensity

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