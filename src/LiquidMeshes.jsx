import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, Color } from "three";
import { useControls } from "leva";

import liquidVertexShader from "./shaders/liquid/vertex.glsl";
import liquidFragmentShader from "./shaders/liquid/fragment.glsl";
import { useEffect, useLayoutEffect, useMemo } from "react";

const LiquidMeshes = ({ well, cauldron }) => {
    const wellControls = useControls("Well", {
        uColorStart: "#3f8ac0",
        uColorEnd: "#106fb3",
        
    });

    const cauldronControls = useControls("Cauldron", {
        uColorStart: "#89b359",
        uColorEnd: "#4b6647",
    });

    const wellShaderMaterial = useMemo( () => new ShaderMaterial({
        vertexShader: liquidVertexShader,
        fragmentShader: liquidFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColorStart: { value: new Color(wellControls.uColorStart) },
            uColorEnd: { value: new Color(wellControls.uColorEnd) },
        },
        transparent: true,
    }), []);

    const cauldronShaderMaterial = useMemo( () => new ShaderMaterial({
        vertexShader: liquidVertexShader,
        fragmentShader: liquidFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColorStart: { value: new Color(cauldronControls.uColorStart) },
            uColorEnd: { value: new Color(cauldronControls.uColorEnd) },
        },
        transparent: true,
    }), []);

    useLayoutEffect(() => {
        well.position.y += 0.1;
        well.material = wellShaderMaterial;
        cauldron.material = cauldronShaderMaterial;
    }, [])

    useFrame((state, delta) => {
        well.material.uniforms.uTime.value = state.clock.elapsedTime;
        well.material.uniforms.uColorStart.value = new Color(wellControls.uColorStart);
        well.material.uniforms.uColorEnd.value = new Color(wellControls.uColorEnd);

        cauldron.material.uniforms.uTime.value = state.clock.elapsedTime;
        cauldron.material.uniforms.uColorStart.value = new Color(cauldronControls.uColorStart);
        cauldron.material.uniforms.uColorEnd.value = new Color(cauldronControls.uColorEnd);
    });
};

export default LiquidMeshes;
