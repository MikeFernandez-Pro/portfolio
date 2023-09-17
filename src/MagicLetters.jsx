import { Float, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three"
import { useStore } from "./ZustandStorage";
import gsap from "gsap";

import floatingTextVertexShader from "/shaders/floatingText/vertex.glsl"
import floatingTextFragmentShader from "/shaders/floatingText/fragment.glsl"

const MagicLetters = ({ magicLetters, texture}) => {

    const { nodes } = useGLTF("/models/magicLetters.glb")

    const wordsShaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uOpacity: {value: 0},
            uTexture: {value: texture},
         },
        vertexShader: `
        uniform float uTime;

        varying vec2 vUv;

        void main()
        {
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);
            

            modelPosition.y += sin(modelPosition.x * 10.0 + uTime) * 0.02;

             modelPosition.y += sin(modelPosition.y * 0.5 + uTime) * 0.01;


            vec4 viewPosition = viewMatrix * modelPosition;
            
           
            vec4 projectionPosition = projectionMatrix * viewPosition;
        
            gl_Position = projectionPosition;
        
            vUv = uv;
        }
        `,
        fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uOpacity;

        varying vec2 vUv;

        void main()
{
    vec4 textureColor = texture2D(uTexture, vUv);
    textureColor.rgb = mix(textureColor.rgb, vec3(0.93, 0.5, 0.2), 1.0);
    textureColor.a *= uOpacity;
    gl_FragColor = textureColor * 2.0;
}
        `,
        side: THREE.DoubleSide,
        transparent: true,
        toneMapped: false,
    })

    const magicCircleActivation = useStore(state => state.magicCircleActivation)

    if (magicCircleActivation) {
      gsap.to(wordsShaderMaterial.uniforms.uOpacity, { duration: 1, delay: 1.5, value: 1 })
    }

    useFrame(state => {
        wordsShaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    })

    console.log(magicLetters.geometry)
    return (
        <skinnedMesh
              geometry={magicLetters.geometry} 
              material={wordsShaderMaterial}
              skeleton={magicLetters.skeleton}
              morphTargetDictionary={magicLetters.morphTargetDictionary}
              morphTargetInfluences={magicLetters.morphTargetInfluences}
            />
    )
};

useGLTF.preload("/models/magicLetters.glb")

export default MagicLetters;