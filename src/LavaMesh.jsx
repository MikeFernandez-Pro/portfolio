import { useFrame } from "@react-three/fiber";
import {ShaderMaterial, Color} from 'three'
import { useControls } from 'leva'

import waterVertexShader from './shaders/lava/vertex.glsl'
import waterFragmentShader from './shaders/lava/fragment.glsl'
import gsap from "gsap";



const LavaMesh = ({furnace}) => {    

    const controls = useControls("Oven Lava", {

        uWavesElevation: 0.1,
        uWavesFrequency: 4,
        uWavesSpeed: 0.2,
        uWavesIterations: 1,
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
    
            uWavesElevation: {value: controls.uWavesElevation},
            uWavesFrequency: {value: controls.uWavesFrequency},
            uWavesSpeed: {value: controls.uWavesSpeed},
            uWavesIterations: {value: controls.uWavesIterations},
    
            uDepthColor : {value: new Color(controls.uDepthColor)},
            uSurfaceColor : {value: new Color(controls.uSurfaceColor)},
            uColorMultiplier: {value: controls.uColorMultiplier},
            uIntensity: {value: controls.uIntensity},
        },
    })
    
    gsap.fromTo(
        lavaShaderMaterial.uniforms.uIntensity,
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
        lavaShaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
     })

     return (
        <skinnedMesh
        geometry={furnace.geometry}
        material={lavaShaderMaterial}
        skeleton={furnace.skeleton}
        morphTargetDictionary={furnace.morphTargetDictionary}
        morphTargetInfluences={furnace.morphTargetInfluences}
      />
     )

};

export default LavaMesh;