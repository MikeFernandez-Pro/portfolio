import { useFrame } from "@react-three/fiber";
import {ShaderMaterial, Color} from 'three'
import { useControls } from 'leva'

import waterVertexShader from './shaders/lava/vertex.glsl'
import waterFragmentShader from './shaders/lava/fragment.glsl'
import gsap from "gsap";



const LavaMesh = ({lavaMesh}) => {    

    const controls = useControls("Oven Lava", {

        uSmallWavesElevation: 0.1,
        uSmallWavesFrequency: 4,
        uSmallWavesSpeed: 0.2,
        uSmallWavesIterations: 1,
        uDepthColor: "#ffa172",
        uSurfaceColor: "#ff0000",
        uColorMultiplier: {value: 5, min: 0, max: 20},
        uIntensity: {value: 3, min: 0, max: 10}
    })


    const lavaShaderMaterial = new ShaderMaterial({
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        uniforms: {
            uTime: {value: 0},
    
            uSmallWavesElevation: {value: controls.uSmallWavesElevation},
            uSmallWavesFrequency: {value: controls.uSmallWavesFrequency},
            uSmallWavesSpeed: {value: controls.uSmallWavesSpeed},
            uSmallWavesIterations: {value: controls.uSmallWavesIterations},
    
            uDepthColor : {value: new Color(controls.uDepthColor)},
            uSurfaceColor : {value: new Color(controls.uSurfaceColor)},
            uColorMultiplier: {value: controls.uColorMultiplier},
            uIntensity: {value: controls.uIntensity},
        },
    })

    lavaMesh.material = lavaShaderMaterial;
    
    gsap.fromTo(
        lavaMesh.material.uniforms.uIntensity,
        {value: 2 },
        {
            value: 3,
            delay: 1,
            duration: 1.75,
            repeat: -1,
            ease: "back",
            yoyo:true
        }
    )

     useFrame((state, delta) => {   
        lavaMesh.material.uniforms.uTime.value = state.clock.elapsedTime;
     })

};

export default LavaMesh;