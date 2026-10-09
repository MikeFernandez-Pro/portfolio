import * as THREE from 'three/webgpu';
import {
  clamp,
  max,
  min,
  positionGeometry,
  pow,
  sin,
  smoothstep,
  time,
  uniform,
  uv,
  vec3,
} from 'three/tsl';

/**
 * Per-column time offset in [0, 100), hashed from the column's world XZ:
 * columns sharing a material don't sway in sync. Same hash as the old GLSL,
 * evaluated on the CPU (the instanced columns pass it as an attribute).
 */
const smokeColumnTimeOffset = (x, z) => {
  const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return (h - Math.floor(h)) * 100;
};

/** Uniform nodes of the bonfire / torch smoke, from a defaults object. */
const createSmokeUniforms = defaults => ({
  uColor: uniform(new THREE.Color(defaults.color)),
  uOpacity: uniform(defaults.opacity),
  uFadeHeight: uniform(defaults.fadeHeight),
  uBaseFade: uniform(defaults.baseFade),
  uTimeOffsetStrength: uniform(defaults.timeOffsetStrength),
  uDisplacementUv: uniform(defaults.swayScale),
  uDisplacementUvY: uniform(defaults.swayPower),
});

/**
 * Bonfire / torch smoke column on a 1x10 plane (the profiles work in local
 * space). `timeOffset`: float node, the column's unscaled time offset.
 * `place`: maps the swayed plane-local position to the mesh's local space
 * (SmokeColumns scales and offsets each column there: a positionNode
 * replaces the InstancedMesh transform in three r186, so the columns do
 * their own instancing).
 */
const createSmokeMaterial = (u, timeOffset, place = position => position) => {
  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
  });

  const columnTime = time.add(timeOffset.mul(u.uTimeOffsetStrength));

  // Sway growing with height. max: below the anchor (y < 0) the GLSL pow was
  // NaN; that half is fully faded out anyway (alpha 0 under positionY 0)
  const p = positionGeometry;
  const sway = sin(p.y.mul(u.uDisplacementUv).sub(columnTime))
    .mul(pow(max(p.y, 0), u.uDisplacementUvY))
    .mul(0.1);
  material.positionNode = place(vec3(p.x.add(sway), p.y, p.z));

  // Soft vertical borders, fading with height. MSAA can extrapolate the
  // height past its range at plane edges: floor the divisor and clamp so
  // alpha never goes negative or infinite
  const borderAlpha = min(uv().x.mul(30), uv().x.oneMinus().mul(30)).mul(
    uv().y.oneMinus()
  );
  const positionY = p.y;
  const alpha = clamp(
    u.uFadeHeight.div(max(positionY, 0.0001)).mul(borderAlpha),
    0,
    1
  )
    .mul(u.uOpacity)
    // Soften the column base so it doesn't draw a hard line where the plane
    // intersects the surface it rises from (0 = off)
    .mul(smoothstep(0, max(u.uBaseFade, 0.0001), positionY));

  material.colorNode = u.uColor;
  material.opacityNode = alpha;

  return material;
};

export { createSmokeMaterial, createSmokeUniforms, smokeColumnTimeOffset };
