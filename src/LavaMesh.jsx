import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, Color } from 'three'
import { useControls } from 'leva'

import waterVertexShader from './shaders/lava/vertex.glsl'
import waterFragmentShader from './shaders/lava/fragment.glsl'
import gsap from "gsap";
import { useEffect, useLayoutEffect } from "react";



const LavaMesh = ({ lavaMesh }) => {

    const controls = useControls("Oven Lava", {

        uWavesElevation: 0.1,
        uWavesFrequency: 4,
        uWavesSpeed: 0.2,
        uWavesIterations: 1,
        uDepthColor: "#ffa172",
        uSurfaceColor: "#ff0000",
        uColorMultiplier: { value: 5, min: 0, max: 20 },
        uIntensity: { value: 3, min: 0, max: 10 }
    })


    const lavaShaderMaterial = useMemo(() => new ShaderMaterial({
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        uniforms: {
            uTime: { value: 0 },

            uWavesElevation: { value: controls.uWavesElevation },
            uWavesFrequency: { value: controls.uWavesFrequency },
            uWavesSpeed: { value: controls.uWavesSpeed },
            uWavesIterations: { value: controls.uWavesIterations },

            uDepthColor: { value: new Color(controls.uDepthColor) },
            uSurfaceColor: { value: new Color(controls.uSurfaceColor) },
            uColorMultiplier: { value: controls.uColorMultiplier },
            uIntensity: { value: controls.uIntensity },
        },
    }), []);


    useLayoutEffect(() => {
        lavaMesh.material = lavaShaderMaterial;

        gsap.fromTo(
            lavaMesh.material.uniforms.uIntensity,
            { value: 2.5 },
            {
                value: 3,
                delay: 2.1,
                duration: 1.7,
                repeat: -1,
                ease: "back",
                yoyo: true
            }
        )
    }, [])



    useFrame((state, delta) => {
        lavaMesh.material.uniforms.uTime.value = state.clock.elapsedTime;
    })

};

export default LavaMesh;