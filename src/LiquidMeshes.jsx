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
        uColorStart: "#a2d16b",
        uColorEnd: "#75ad6d",
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

    well.material = wellShaderMaterial;
    cauldron.material = cauldronShaderMaterial;

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
