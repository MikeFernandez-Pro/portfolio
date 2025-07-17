import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import sparksVertexShader from "../../../shaders/sparks/vertex.glsl";
import sparksFragmentShader from "../../../shaders/sparks/fragment.glsl";
import { useMemo } from "react";

const SPEED = 6;
const COLOR = "#f85f3d";

const SparksMaterial = ({ size }) => {
  const SparksShaderMaterial = useMemo(
    () =>
      shaderMaterial(
        {
          uTime: 0,
          uSize: size,
          uSpeed: SPEED,
          uColor: new THREE.Color(COLOR),
          uResolution: new THREE.Vector2(),
        },
        sparksVertexShader,
        sparksFragmentShader
      ),
    [size]
  );

  extend({ SparksShaderMaterial });

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
