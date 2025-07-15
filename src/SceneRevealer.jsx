import { forwardRef, useEffect, useMemo } from "react";
import sceneRevealerEffect from "./sceneRevealerEffect";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useTexture } from "@react-three/drei";
import PerlinNoiseImage from "/textures/perlin.png";

import * as THREE from "three";

const SceneRevealer = forwardRef(({}, ref) => {
  const aspectRatio = useThree((state) => state.viewport.aspect);

  const perlinNoiseTexture = useTexture(PerlinNoiseImage, (texture) => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  });

  const effect = useMemo(
    () => new sceneRevealerEffect(aspectRatio, perlinNoiseTexture),
    []
  );

  useEffect(() => {
    gsap.to(ref.current?.uniforms.get("progress"), {
      value: 0.35,
      duration: 1,
      delay: 0.5,
      ease: "circ.out",
    });
  }, []);

  useFrame(({ clock }) => {
    ref.current.uniforms.get("uTime").value = clock.elapsedTime;
    ref.current.uniforms.get("aspectRatio").value = aspectRatio;
  });

  return <primitive ref={ref} object={effect} />;
});

export default SceneRevealer;
