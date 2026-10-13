import React from 'react';
import { Cloud, Clouds as CloudsGroup } from '@react-three/drei/webgpu';
import * as THREE from 'three/webgpu';
import { mrt, output } from 'three/tsl';

import { AO_MASK } from '#postprocessing/aoMask.js';
// drei's default puff texture, self-hosted (drei fetches it from githack)
import cloudUrl from '#assets/textures/cloud.png';

// drei 10 keeps volume at 6 (puff thickness) but defaults growth to 4 and
// MeshLambertMaterial. Combined with this scene's lighting/ACES that reads
// thicker than drei 9: growth is cut to 3.5 and the puffs use
// MeshStandardMaterial (softer response to the directional light) so they
// stay sprite-like. Node material: drei 11's cloud factory multiplies the
// per-puff opacity into opacityNode, which a classic material ignores.

// The puffs also write their color into the AO mask (see aoMask.js): without
// it the islands' ambient occlusion shows through them. `output` must be
// listed too: when the pass has no MRT (AO off, mobile), three renders the
// material's mrtNode alone, and the mask entry is skipped
class CloudMaterial extends THREE.MeshStandardNodeMaterial {
  constructor() {
    super();
    this.mrtNode = mrt({ output, [AO_MASK]: output });
  }
}

const CLOUD = {
  speed: 0.1,
  volume: 6,
  growth: 3.5,
};

const Clouds = () => {
  return (
    <CloudsGroup position-z={6.5} material={CloudMaterial} texture={cloudUrl}>
      <Cloud {...CLOUD} position={[10, 13, 1]} opacity={0.8} scale={2.5} />
      <Cloud {...CLOUD} position={[-15, 15, 3]} opacity={0.5} scale={2} />
      <Cloud {...CLOUD} position={[-4, -3, 5]} opacity={0.3} scale={3} />
      <Cloud {...CLOUD} position={[-25, 8, 10]} opacity={0.1} scale={2} />
      <Cloud {...CLOUD} position={[0, 10, 15]} opacity={0.05} scale={3} />
    </CloudsGroup>
  );
};

export default React.memo(Clouds);
