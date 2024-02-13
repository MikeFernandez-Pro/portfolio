import { useLayoutEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, Color } from "three";

import liquidVertexShader from "./shaders/liquid/vertex.glsl";
import liquidFragmentShader from "./shaders/liquid/fragment.glsl";

const LiquidsShaders = ({ well, cauldron }) => {
    const wellShaderMaterial = useMemo(
        () =>
            new ShaderMaterial({
                vertexShader: liquidVertexShader,
                fragmentShader: liquidFragmentShader,
                uniforms: {
                    uTime: { value: 0 },
                    uColorStart: { value: new Color("#3f8ac0") },
                    uColorEnd: { value: new Color("#106fb3") },
                },
                transparent: true,
            }),
        []
    );

    const cauldronShaderMaterial = useMemo(
        () =>
            new ShaderMaterial({
                vertexShader: liquidVertexShader,
                fragmentShader: liquidFragmentShader,
                uniforms: {
                    uTime: { value: 0 },
                    uColorStart: { value: new Color("#89b359") },
                    uColorEnd: { value: new Color("#4b6647") },
                },
                transparent: true,
            }),
        []
    );

    useLayoutEffect(() => {
        well.position.y += 0.1;
        well.material = wellShaderMaterial;
        cauldron.material = cauldronShaderMaterial;
    }, []);

    useFrame(({ clock }) => {
        well.material.uniforms.uTime.value = clock.elapsedTime;
        cauldron.material.uniforms.uTime.value = clock.elapsedTime;
    });
};

export default LiquidsShaders;
