import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import sparksVertexShader from "../../shaders/sparks/vertex.glsl";
import sparksFragmentShader from "../../shaders/sparks/fragment.glsl";

const SPEED = 6;
const COLOR = "#f85f3d";

const SparksMaterial = ({size, pixelRatio} ) => {

    const SparksShaderMaterial = shaderMaterial(
        {
            uTime: 0,
            uSize: size * pixelRatio,
            uSpeed: SPEED,
            uColor: new THREE.Color(COLOR),
        },
        sparksVertexShader,
        sparksFragmentShader
    )

    extend({ SparksShaderMaterial })

    return (
        <sparksShaderMaterial
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            vertexColors={true}
            toneMapped={false}
        />
    );
};

export default SparksMaterial;
