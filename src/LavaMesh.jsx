import { useFrame } from "@react-three/fiber";
import {ShaderMaterial, Color} from 'three'
import { useControls } from 'leva'

import waterVertexShader from './shaders/lava/vertex.glsl'
import waterFragmentShader from './shaders/lava/fragment.glsl'



const LavaMesh = ({lavaMesh}) => {    

    const controls = useControls({

        uSmallWavesElevation: 0.1,
        uSmallWavesFrequency: 4,
        uSmallWavesSpeed: 0.2,
        uSmallWavesIterations: 1,
        uDepthColor: "#ffa172",
        uSurfaceColor: "#ff0000"
    })


    const WaterMaterial = new ShaderMaterial({
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        uniforms: {
            uTime: {value: 0},
            
            uBigWavesElevation: {value: 0},
            uBigWavesFrequency: {value: [0, 0]},
            uBigWavesSpeed: {value: 0},
    
            uSmallWavesElevation: {value: controls.uSmallWavesElevation},
            uSmallWavesFrequency: {value: controls.uSmallWavesFrequency},
            uSmallWavesSpeed: {value: controls.uSmallWavesSpeed},
            uSmallWavesIterations: {value: controls.uSmallWavesIterations},
    
            uDepthColor : {value: new Color(controls.uDepthColor)},
            uSurfaceColor : {value: new Color(controls.uSurfaceColor)},
            uColorOffset: {value: 0.08},
            uColorMultiplier: {value:5}
        },
    })

    lavaMesh.material = WaterMaterial;

     useFrame((state, delta) => {
        lavaMesh.material.uniforms.uTime.value = state.clock.elapsedTime;

        lavaMesh.material.uniforms.uSmallWavesElevation.value = controls.uSmallWavesElevation
        lavaMesh.material.uniforms.uSmallWavesFrequency.value = controls.uSmallWavesFrequency
        lavaMesh.material.uniforms.uSmallWavesSpeed.value = controls.uSmallWavesSpeed
        lavaMesh.material.uniforms.uSmallWavesIterations.value = controls.uSmallWavesIterations
        lavaMesh.material.uniforms.uDepthColor.value = new Color(controls.uDepthColor)
        lavaMesh.material.uniforms.uSurfaceColor.value = new Color(controls.uSurfaceColor)
        
     })

};

export default LavaMesh;