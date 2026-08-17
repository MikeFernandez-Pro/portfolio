import { useRef } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

import { useControls } from '#utils/useControls.jsx';

import xLogoImage from '#assets/textures/x2.png';

// The baked Vercel sign quads (hidden in Islands.jsx) spanned
// x -2.54..-1.46, y -1.89..-1.38, z 11.62..12.20 in island-local space —
// this plane takes their spot on the sign post
const X_SIGN_POSITION = [-2.0, -1.63, 11.92];
// YXZ order: yaw faces the sign first, so X and Z rotate the plane on itself
const X_SIGN_ROTATION_X = 0;
const X_SIGN_ROTATION_Y = 0.49;
const X_SIGN_ROTATION_Z = -0.046;
const X_SIGN_SIZE = 0.5;
const X_SIGN_SCALE = 1.18;

// Matches the GLB "signs" material tuned via the debug panel
const X_SIGN_COLOR = '#ffffff';
const X_SIGN_EMISSIVE_COLOR = '#ff9165';
const X_SIGN_EMISSIVE_INTENSITY = 4.6;

const XSign = () => {
  const meshRef = useRef();
  const materialRef = useRef();

  const xLogoTexture = useTexture(xLogoImage, texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
  });

  useControls(
    'XSign',
    {
      color: {
        value: X_SIGN_COLOR,
        onChange: value => {
          materialRef.current?.color.set(value);
        },
      },
      emissiveColor: {
        value: X_SIGN_EMISSIVE_COLOR,
        onChange: value => {
          materialRef.current?.emissive.set(value);
        },
      },
      emissiveIntensity: {
        value: X_SIGN_EMISSIVE_INTENSITY,
        min: 0,
        max: 10,
        step: 0.01,
        onChange: value => {
          if (materialRef.current) {
            materialRef.current.emissiveIntensity = value;
          }
        },
      },
      rotationX: {
        value: X_SIGN_ROTATION_X,
        min: -Math.PI / 2,
        max: Math.PI / 2,
        step: 0.001,
        onChange: value => {
          if (meshRef.current) {
            meshRef.current.rotation.x = value;
          }
        },
      },
      rotationY: {
        value: X_SIGN_ROTATION_Y,
        min: 0,
        max: Math.PI,
        step: 0.001,
        onChange: value => {
          if (meshRef.current) {
            meshRef.current.rotation.y = value;
          }
        },
      },
      rotationZ: {
        value: X_SIGN_ROTATION_Z,
        min: -Math.PI,
        max: Math.PI,
        step: 0.001,
        onChange: value => {
          if (meshRef.current) {
            meshRef.current.rotation.z = value;
          }
        },
      },
      scale: {
        value: X_SIGN_SCALE,
        min: 0.1,
        max: 3,
        step: 0.01,
        onChange: value => {
          meshRef.current?.scale.setScalar(value);
        },
      },
    },
    { collapsed: true, reset: true }
  );

  return (
    <mesh
      ref={meshRef}
      position={X_SIGN_POSITION}
      rotation={[
        X_SIGN_ROTATION_X,
        X_SIGN_ROTATION_Y,
        X_SIGN_ROTATION_Z,
        'YXZ',
      ]}
      scale={X_SIGN_SCALE}
    >
      <planeGeometry args={[X_SIGN_SIZE, X_SIGN_SIZE]} />
      <meshStandardMaterial
        ref={materialRef}
        map={xLogoTexture}
        alphaTest={0.5}
        emissive={X_SIGN_EMISSIVE_COLOR}
        emissiveIntensity={X_SIGN_EMISSIVE_INTENSITY}
      />
    </mesh>
  );
};

useTexture.preload(xLogoImage);

export { XSign };
