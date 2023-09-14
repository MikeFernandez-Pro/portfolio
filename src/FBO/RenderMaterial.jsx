import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import vertexShader from "../shaders/fbo/render/vertex.glsl";
import fragmentShader from "../shaders/fbo/render/fragment.glsl";

const RenderMaterial = shaderMaterial(
  {
    uPosition: null,
    uSize: 20,
    uTime: 0,
    uScaleRatio: 1,
  },
  vertexShader,
  fragmentShader
);

extend({ RenderMaterial });
