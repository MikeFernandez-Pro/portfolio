import * as THREE from 'three/webgpu';

// Trample field: a small map over the patch XZ where each texel holds a
// world-space push vector - the direction the blades lean, with its length
// as the strength (0-1). The character's footprint presses its texels toward
// a target push (radially away from the feet, blended with the running
// direction), and every texel relaxes back to zero as a damped spring.
// Blades fold under the feet, part around the stride, and stand back up with
// a soft settle. The simulation runs on floats; the RG8 texture is what the
// vertex shader samples (byte 128 = 0).
export const TRAMPLE_SIZE = 128;
const TRAMPLE_TEXELS = TRAMPLE_SIZE * TRAMPLE_SIZE;

// Displacement / velocity below this counts as settled
const TRAMPLE_REST = 1e-3;

/**
 * `press` stamps a footprint, `relax` runs one spring step over the field
 * (returns whether anything still moves), `encode` uploads the field to
 * `texture`.
 */
export const createTrampleField = () => {
  const pushX = new Float32Array(TRAMPLE_TEXELS);
  const pushZ = new Float32Array(TRAMPLE_TEXELS);
  const velocityX = new Float32Array(TRAMPLE_TEXELS);
  const velocityZ = new Float32Array(TRAMPLE_TEXELS);
  const data = new Uint8Array(TRAMPLE_TEXELS * 2).fill(128);

  const texture = new THREE.DataTexture(
    data,
    TRAMPLE_SIZE,
    TRAMPLE_SIZE,
    THREE.RGFormat,
    THREE.UnsignedByteType
  );
  texture.colorSpace = THREE.NoColorSpace;
  // Updated every frame: skip the mipmap regeneration, sample linearly
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  // Presses the footprint into the field. Center and radius in texels; the
  // texel grid maps to the world as u -> -x, v -> +z (same mapping as patchUv
  // in the vertex shader), and the stored vectors are world-space xz.
  // - falloff (1 - r^2)^2: full push under the feet, zero slope at the rim
  // - direction: radial away from the feet, blended toward the running
  //   direction so a moving character lays the blades along its path instead
  //   of pointing them all back at where it stands
  // - blend: how much of the way to the target this frame (1 = snap)
  // - pressure: 0-1 weight on the target (how hard the character is
  //   treading: full at running speed, fading out as it slows down). Below
  //   1, texels the target no longer holds down are left to the spring
  //   instead of being dragged, so a stop releases the blades continuously
  const press = (
    centerX,
    centerY,
    radius,
    moveDirX,
    moveDirZ,
    directionality,
    blend,
    pressure
  ) => {
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(TRAMPLE_SIZE - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(TRAMPLE_SIZE - 1, Math.ceil(centerY + radius));
    const invRadiusSq = 1 / (radius * radius);

    for (let iy = minY; iy <= maxY; iy++) {
      for (let ix = minX; ix <= maxX; ix++) {
        const dx = ix + 0.5 - centerX;
        const dy = iy + 0.5 - centerY;
        const r2 = (dx * dx + dy * dy) * invRadiusSq;
        if (r2 >= 1) continue;
        const falloff = (1 - r2) * (1 - r2);

        // Radial world direction (texel +x is world -x, texel +y is world +z)
        const r = Math.sqrt(dx * dx + dy * dy);
        let dirX = r > 1e-4 ? -dx / r : moveDirX;
        let dirZ = r > 1e-4 ? dy / r : moveDirZ;
        dirX = dirX * (1 - directionality) + moveDirX * directionality;
        dirZ = dirZ * (1 - directionality) + moveDirZ * directionality;
        const dirLength = Math.hypot(dirX, dirZ);
        if (dirLength < 1e-4) continue;
        const targetLength = falloff * pressure;
        const targetX = (dirX / dirLength) * targetLength;
        const targetZ = (dirZ / dirLength) * targetLength;

        const i = iy * TRAMPLE_SIZE + ix;
        // Pressing mostly adds: a texel the trail already bent harder keeps
        // its bend and only turns slowly toward the new direction. While the
        // tread eases off, such texels are released to the spring entirely.
        const current = Math.hypot(pushX[i], pushZ[i]);
        let w = blend;
        if (targetLength < current) {
          if (pressure < 1) continue;
          w = blend * 0.25;
        }
        pushX[i] += (targetX - pushX[i]) * w;
        pushZ[i] += (targetZ - pushZ[i]) * w;
        // The foot holds the blades still
        velocityX[i] *= 1 - w;
        velocityZ[i] *= 1 - w;
      }
    }
  };

  // One spring step over the whole field; returns whether anything still
  // moves
  const relax = (dt, stiffness, damping) => {
    let moving = false;
    const restSq = TRAMPLE_REST * TRAMPLE_REST;
    for (let i = 0; i < TRAMPLE_TEXELS; i++) {
      let x = pushX[i];
      let z = pushZ[i];
      let vx = velocityX[i];
      let vz = velocityZ[i];
      if (x * x + z * z < restSq && vx * vx + vz * vz < restSq) {
        pushX[i] = 0;
        pushZ[i] = 0;
        velocityX[i] = 0;
        velocityZ[i] = 0;
        continue;
      }
      vx += (-stiffness * x - damping * vx) * dt;
      vz += (-stiffness * z - damping * vz) * dt;
      x += vx * dt;
      z += vz * dt;
      // A blade can't lean past flat
      const lengthSq = x * x + z * z;
      if (lengthSq > 1) {
        const inv = 1 / Math.sqrt(lengthSq);
        x *= inv;
        z *= inv;
      }
      pushX[i] = x;
      pushZ[i] = z;
      velocityX[i] = vx;
      velocityZ[i] = vz;
      moving = true;
    }
    return moving;
  };

  const encode = () => {
    for (let i = 0; i < TRAMPLE_TEXELS; i++) {
      data[i * 2] = 128 + Math.round(pushX[i] * 127);
      data[i * 2 + 1] = 128 + Math.round(pushZ[i] * 127);
    }
    texture.needsUpdate = true;
  };

  return { texture, press, relax, encode };
};
