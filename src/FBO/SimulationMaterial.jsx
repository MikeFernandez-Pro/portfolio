import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import * as THREE from "three";
import vertexShader from "../shaders/fbo/simulation/vertex.glsl";
import fragmentShader from "../shaders/fbo/simulation/fragment.glsl";

const SimulationMaterial = shaderMaterial(
  {
    uPosition: null,
    uOriginalPosition: null,
    uMouse: new THREE.Vector3(-10,-10,10),
    uTime: 0,
  },
  vertexShader,
  fragmentShader
);

extend({ SimulationMaterial });
