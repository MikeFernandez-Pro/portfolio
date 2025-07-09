import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useControls } from "leva";

import starsVertexShader from "./shaders/stars/vertex.glsl";
import starsFragmentShader from "./shaders/stars/fragment.glsl";

const SKY_RADIUS = 120;

const Experience = () => {
  const { size, aspect } = useThree((state) => ({
    size: state.size,
    aspect: state.viewport.dpr,
  }));

  // Controls
  const particlesControls = useControls("Stars", {
    count: {
      value: 5000,
      min: 0,
      max: 10000,
    },
    pointSize: {
      value: 1.2,
      min: 0,
      max: 10,
      onChange: (value) => {
        fireworksMaterial.uniforms.uSize.value = value;
      },
    },
    color1: {
      value: "#FFD700",
      onChange: (value) => {
        fireworksMaterial.uniforms.uColor1.value = new THREE.Color(value);
      },
    },
    color2: {
      value: "#3B5BA5 ",
      onChange: (value) => {
        fireworksMaterial.uniforms.uColor2.value = new THREE.Color(value);
      },
    },
    color3: {
      value: "#A3C1DA",
      onChange: (value) => {
        fireworksMaterial.uniforms.uColor3.value = new THREE.Color(value);
      },
    },
    brightness: {
      value: 3.3,
      min: 0,
      max: 10,
      onChange: (value) => {
        fireworksMaterial.uniforms.uBrightness.value = value;
      },
    },
  });

  const fireWorkTexture = useTexture("/textures/star.png", (texture) => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.flipY = false;
  });

  // Geometry
  const fireworksGeometry = useMemo(() => {
    const positionsArray = new Float32Array(particlesControls.count * 3);
    const sizesArray = new Float32Array(particlesControls.count);
    const colorsArray = new Float32Array(particlesControls.count);

    for (let i = 0; i < particlesControls.count; i++) {
      const i3 = i * 3;

      const spherical = new THREE.Spherical(
        SKY_RADIUS * (0.75 + Math.random() * 0.25),
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      const position = new THREE.Vector3();
      position.setFromSpherical(spherical);

      positionsArray[i3] = position.x;
      positionsArray[i3 + 1] = position.y;
      positionsArray[i3 + 2] = position.z;

      sizesArray[i] = Math.random();
      colorsArray[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positionsArray, 3)
    );
    geometry.setAttribute(
      "aSize",
      new THREE.Float32BufferAttribute(sizesArray, 1)
    );
    geometry.setAttribute(
      "aColor",
      new THREE.Float32BufferAttribute(colorsArray, 1)
    );

    return geometry;
  }, [particlesControls.count]);

  // Material
  const fireworksMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: new THREE.Uniform(0),
          uSize: new THREE.Uniform(particlesControls.pointSize),
          uTexture: new THREE.Uniform(fireWorkTexture),
          uColor1: new THREE.Uniform(new THREE.Color(particlesControls.color1)),
          uColor2: new THREE.Uniform(new THREE.Color(particlesControls.color2)),
          uColor3: new THREE.Uniform(new THREE.Color(particlesControls.color3)),
          uBrightness: new THREE.Uniform(particlesControls.brightness),
          uResolution: new THREE.Uniform(
            new THREE.Vector2(size.width * aspect, size.height * aspect)
          ),
        },
        vertexShader: starsVertexShader,
        fragmentShader: starsFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  useFrame(({ clock }) => {
    fireworksMaterial.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points
      geometry={fireworksGeometry}
      material={fireworksMaterial}
      rotation-y={Math.PI / 2}
    />
  );
};

export default Experience;
