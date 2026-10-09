import { useEffect, useMemo } from 'react';

import { createSparksMaterial, createSparksUniforms } from './sparksMaterial';
import {
  anchorSpread,
  createParticleSprite,
  particleAttribute,
} from '#utils/pointSprites.js';

const TorchSparks = ({
  particlesCount,
  config,
  color,
  intensity,
  sizeScale = 1,
}) => {
  const size = config.size * sizeScale;

  const { sparks, uniforms } = useMemo(() => {
    const count = particlesCount * config.offsets.length;
    const positions = new Float32Array(count * 3);
    const offsets = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const elevation = new Float32Array(count);

    const torchOf = anchorSpread(count, config.offsets.length);

    for (let i = 0; i < count; i++) {
      // Default sparks positions
      positions[i * 3 + 0] = (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 2] = 0;

      // Randomized sparks scales
      scales[i] = Math.random() * 0.5 + 0.5;

      // Randomized sparks Y axe elevation
      elevation[i] = 5 + Math.random() * 25.0;

      // Each spark rises from its torch
      const offset = config.offsets[torchOf(i)];
      offsets[i * 3 + 0] = offset[0];
      offsets[i * 3 + 1] = offset[1];
      offsets[i * 3 + 2] = offset[2];
    }

    const uniforms = createSparksUniforms({ size, color, intensity });
    const material = createSparksMaterial(uniforms, {
      position: particleAttribute(positions, 3),
      aScale: particleAttribute(scales, 1),
      aElevation: particleAttribute(elevation, 1),
      aOffset: particleAttribute(offsets, 3),
    });

    const sparks = createParticleSprite(material, count);
    sparks.scale.set(...config.scale);
    // Drawn after the renderOrder-0 transparent smoke, whose normal alpha
    // blend would otherwise paint over the sparks (they write no depth, so
    // the draw order is all that layers them)
    sparks.renderOrder = 1;

    return { sparks, uniforms };
  }, [particlesCount, config.offsets.length]);

  useEffect(() => () => sparks.material.dispose(), [sparks]);

  useEffect(() => {
    uniforms.uSize.value = size;
    if (color !== undefined) uniforms.uColor.value.set(color);
    if (intensity !== undefined) uniforms.uIntensity.value = intensity;
  }, [uniforms, size, color, intensity]);

  return <primitive object={sparks} />;
};

export default TorchSparks;
