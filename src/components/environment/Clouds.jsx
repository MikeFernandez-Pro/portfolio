import React from 'react';
import { Cloud, Clouds as CloudsGroup } from '@react-three/drei/webgpu';
import * as THREE from 'three/webgpu';

// drei 10 keeps volume at 6 (puff thickness) but defaults growth to 4 and
// MeshLambertMaterial. Combined with this scene's lighting/ACES that reads
// thicker than drei 9: growth is cut to 3.5 and the puffs use
// MeshStandardMaterial (softer response to the directional light) so they
// stay sprite-like. Node material: drei 11's cloud factory multiplies the
// per-puff opacity into opacityNode, which a classic material ignores.
const CLOUD = {
  speed: 0.1,
  volume: 6,
  growth: 3.5,
};

const Clouds = () => {
  return (
    <CloudsGroup position-z={6.5} material={THREE.MeshStandardNodeMaterial}>
      <Cloud {...CLOUD} position={[10, 13, 1]} opacity={0.8} scale={2.5} />
      <Cloud {...CLOUD} position={[-15, 15, 3]} opacity={0.5} scale={2} />
      <Cloud {...CLOUD} position={[-4, -3, 5]} opacity={0.3} scale={3} />
      <Cloud {...CLOUD} position={[-25, 8, 10]} opacity={0.1} scale={2} />
      <Cloud {...CLOUD} position={[0, 10, 15]} opacity={0.05} scale={3} />
    </CloudsGroup>
  );
};

export default React.memo(Clouds);
