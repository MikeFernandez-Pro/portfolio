import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import * as THREE from "three";
import { useState, useRef, useEffect } from "react";
import CSM from "three-custom-shader-material";
import { patchShaders } from "gl-noise";
import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import gsap from "gsap";

const dissolveEffectShaderMaterial = ({ material, baseMaterial, activation }) => {
    const controls = useControls("magicBooks", {
        intensity: { value: 20, min: 0, max: 50, step: 0.1 },
        color: "#0692c4",
        thickness: { value: 0.02, min: 0, max: 0.1, step: 0.001 },
    });

    const dissolveEffectVertexShader = ` /* glsl */
  varying vec2 vUv;
  void main() {
    vUv = uv;
  }`;

    const dissolveEffectFragmentShader = ` /* glsl */
  varying vec2 vUv;
  uniform float uThickness;
  uniform vec3 uColor;
  uniform float uProgress;

  void main() {
    // Noise Generation
    // default => gln_tFBMOpts opts = gln_tFBMOpts(1.0, 0.3, 2.0, 5.0, 1.0, 5, false, false);
    gln_tFBMOpts opts = gln_tFBMOpts(7.5, 0.3, 2.0, 5.0, 2.0, 5, false, false);
    float noise = gln_sfbm(vUv, opts);
    noise = gln_normalize(noise);

    float progress = uProgress;
    ;
    float alpha = step(1.0 - progress, noise);
    float border = step((1.0 - progress) - uThickness, noise) - alpha;

    csm_DiffuseColor.a = alpha + border;
    csm_DiffuseColor.rgb = mix(csm_DiffuseColor.rgb, uColor, border);
  }`;
  const uniforms = {
    uThickness: { value: controls.thickness },
    uColor: { value: new THREE.Color(controls.color).multiplyScalar(controls.intensity) },
    uProgress: { value: 0 },
};

    const disolveEffectMaterial = new CustomShaderMaterial({
        baseMaterial: baseMaterial,
        vertexShader: dissolveEffectVertexShader,
        fragmentShader: dissolveEffectFragmentShader,
        silent: true, // Disables the default warning if true
        uniforms: {
            uThickness: { value: controls.thickness },
            uColor: {
                value: new THREE.Color(controls.color).multiplyScalar(controls.intensity),
            },
            uProgress: { value: 1 },
        },
        toneMapped: false,
        transparent: true,
    });

    return disolveEffectMaterial
    // magicBooks.material = disolveEffectMaterial;

    // if (activation) gsap.to(uniforms.uProgress, { duration: 3, delay: 0.5, value: 1 });
};

export default dissolveEffectShaderMaterial;
