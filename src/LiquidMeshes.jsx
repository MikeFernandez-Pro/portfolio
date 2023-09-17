import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, Color } from "three";
import { useControls } from "leva";

import liquidVertexShader from "./shaders/liquid/vertex.glsl";
import liquidFragmentShader from "./shaders/liquid/fragment.glsl";

const LiquidMeshes = ({ well, cauldron }) => {
    const wellControls = useControls("Well", {
        uColorStart: "#94c9e8",
        uColorEnd: "#68bcf8",
    });

    const cauldronControls = useControls("Cauldron", {
        uColorStart: "#b3fc08",
        uColorEnd: "#7bbe72",
    });

    const wellShaderMaterial = new ShaderMaterial({
        vertexShader: liquidVertexShader,
        fragmentShader: liquidFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColorStart: { value: new Color(wellControls.uColorStart) },
            uColorEnd: { value: new Color(wellControls.uColorEnd) },
        },
    });

    const cauldronShaderMaterial = new ShaderMaterial({
        vertexShader: liquidVertexShader,
        fragmentShader: liquidFragmentShader,
        uniforms: {
            uTime: { value: 0 },
            uColorStart: { value: new Color(wellControls.uColorStart) },
            uColorEnd: { value: new Color(wellControls.uColorEnd) },
        },
    });

    useFrame((state, delta) => {
        wellShaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
        wellShaderMaterial.uniforms.uColorStart.value = new Color(wellControls.uColorStart);
        wellShaderMaterial.uniforms.uColorEnd.value = new Color(wellControls.uColorEnd);

        cauldronShaderMaterial.uniforms.uTime.value = state.clock.elapsedTime;
        cauldronShaderMaterial.uniforms.uColorStart.value = new Color(cauldronControls.uColorStart);
        cauldronShaderMaterial.uniforms.uColorEnd.value = new Color(cauldronControls.uColorEnd);
    });

    return (
        <>
        { /* Well water mesh */}
            <skinnedMesh
                geometry={well.geometry}
                material={wellShaderMaterial}
                skeleton={well.skeleton}
                morphTargetDictionary={well.morphTargetDictionary}
                morphTargetInfluences={well.morphTargetInfluences}
            />
            { /* Cauldron potion mesh */}
            <skinnedMesh
                geometry={cauldron.geometry}
                material={cauldronShaderMaterial}
                skeleton={cauldron.skeleton}
                morphTargetDictionary={cauldron.morphTargetDictionary}
                morphTargetInfluences={cauldron.morphTargetInfluences}
            />
        </>
    )
};

export default LiquidMeshes;
