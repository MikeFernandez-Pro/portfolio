import { useAnimations, useGLTF } from "@react-three/drei";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import * as THREE from "three";
import { useEffect } from "react";
import { patchShaders } from "gl-noise";
import { useControls } from "leva";
import gsap from "gsap";
import { useStore } from "./ZustandStorage";

import dissolveEffectVertexShader from './shaders/dissolveEffect/vertex.glsl'
import dissolveEffectFragmentShader from './shaders/dissolveEffect/fragment.glsl'

const MagicBooks = ({ islandPosition }) => {
    const { nodes, materials, animations, scene } = useGLTF("/models/magicBooks.glb");

    const magicBooksAnimations = useAnimations(animations, scene);

    const magicCircleActivation = useStore(state => state.magicCircleActivation)

    useEffect(() => {
        magicBooksAnimations.actions["levitating"].play();
    }, [])

        const controls = useControls("magicBooks", {
            intensity: { value: 20, min: 0, max: 50, step: 0.1 },
            color: "#0692c4",
            thickness: { value: 0.02, min: 0, max: 0.1, step: 0.001 },
        });

        const disolveEffectMaterial = new CustomShaderMaterial({
            baseMaterial: nodes.magicBooks.material,
            vertexShader: dissolveEffectVertexShader,
            fragmentShader: patchShaders(dissolveEffectFragmentShader),
            silent: true, // Disables the default warning if true
            uniforms: {
                uThickness: { value: controls.thickness },
                uColor: {
                    value: new THREE.Color(controls.color).multiplyScalar(controls.intensity),
                },
                uProgress: { value: 0},
            },
            toneMapped: false,
            transparent: true,
        });
    
        if (magicCircleActivation)
            gsap.to(disolveEffectMaterial.uniforms.uProgress, { duration: 3, delay: 0.5, value: 1 });

    return (
        <mesh
            position={islandPosition}
            scale={0.45}
            castShadow
            receiveShadow
            geometry={nodes.magicBooks.geometry}
            material={disolveEffectMaterial}
            morphTargetDictionary={nodes.magicBooks.morphTargetDictionary}
            morphTargetInfluences={nodes.magicBooks.morphTargetInfluences}
        >
        </mesh>
    );
};

useGLTF.preload("/models/magicBooks.glb");

export default MagicBooks;
