import { Float, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three"
import { useStore } from "./ZustandStorage";
import gsap from "gsap";

const MagicLetters = ({ position }) => {

    const { nodes } = useGLTF("/models/magicLetters.glb")

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uOpacity: {value: 0}
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
        uniform float uOpacity;

        varying vec2 vUv;

        void main()
{

    gl_FragColor = vec4(0.97, 0.37, 0.24, uOpacity) * 2.5;
}
        `,
        side: THREE.DoubleSide,
        transparent: true,
        toneMapped: false,
    })

    const magicCircleActivation = useStore(state => state.magicCircleActivation)

    if (magicCircleActivation) {
      gsap.to(material.uniforms.uOpacity, { duration: 2, delay: 2, value: 1 })
    }

    useFrame(state => {
        material.uniforms.uTime.value = state.clock.elapsedTime;
    })

    return (
        <mesh
            position={position}
            scale={0.45}
            geometry={nodes.magicLetters.geometry}
            material={material}
        />
    );
};

useGLTF.preload("/models/magicLetters.glb")

export default MagicLetters;