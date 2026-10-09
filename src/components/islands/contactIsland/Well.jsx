import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei/webgpu';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three/webgpu';
import {
  abs,
  clamp,
  cos,
  float,
  length,
  max,
  mix,
  positionGeometry,
  pow,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';

import { useVoronoiPerlinTexture } from '#utils/packedTextures.js';
import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';

import fishModel from '#assets/models/island/fish.glb?url';

// Water
const FOAM_COLOR = '#ffffff';
const OUTER_WATER_COLOR = '#0c2637';
const INNER_WATER_COLOR = '#26b0cf';
const INNER_CIRCLE_RADIUS = 0.067;
const INNER_CIRCLE_THICKNESS = 0.006;
const INNER_CIRCLE_OFFSET_X = -0.003;
const INNER_CIRCLE_OFFSET_Y = -0.023;
const OUTER_CIRCLE_RADIUS = 0.42;
const OUTER_CIRCLE_THICKNESS = 0.035;
const INNER_PERLIN_STRENGTH = 0.095;
const OUTER_PERLIN_STRENGTH = 0.03;

// Fishes
const FISHES_COLOR = '#00f6d0';
const FISHES_INTENSITY = 12.61;
// Reduced motion: park the orbit (fish hover in place), keep a slow tail sway
const FISHES_SPEED = REDUCED_MOTION_AT_LOAD ? 0 : 0.5;
const BIG_FISH_AMPLITUDE = 0.88;
const SMALL_FISH_AMPLITUDE = 0.66;
const SMALL_FISH_OFFSET = 3;
// Max bend angle (radians) at the tail tip
const FISH_DEFORMATION_STRENGTH = 0.32;
const FISH_WIGGLE_SPEED = REDUCED_MOTION_AT_LOAD ? 2 : 7;

// Fish body spans local Z in fish.glb: head at +3.0, tail at -5.01
const FISH_HEAD_Z = 3.0;
const FISH_TAIL_Z = -5.01;
// Balance point ~1/3 behind the head: the body rotates around it, so the
// head recoils opposite the tail instead of staying welded in place
const FISH_PIVOT_Z = 0.6;
// How far (radians) the wave phase advances from head to tail — makes the
// bend ripple backward along the body instead of flexing all at once
const FISH_WAVE_TRAVEL = 2.0;
// The head still sways/yaws at this fraction of the tail amplitude
const FISH_HEAD_AMPLITUDE = 0.15;

// Well water: radial gradient with two perlin-wobbled foam rings
const createWellMaterial = (u, noiseTexture) => {
  const material = new THREE.MeshStandardNodeMaterial({ transparent: true });

  // perlin = green channel of the packed voronoi/perlin texture
  const noise = texture(noiseTexture, uv().add(time.mul(0.05))).g.sub(0.5);
  const innerDeformation = noise.mul(u.uInnerPerlinStrength);
  const outerDeformation = noise.mul(u.uOuterPerlinStrength);

  const dist = length(uv().sub(0.5));
  const innerDist = length(uv().sub(vec2(0.5).add(u.uInnerCircleOffset)));

  // Radial water fill: outer color at the rim → inner color at the center
  const waterMix = clamp(float(1).sub(dist.mul(2)), 0, 1);
  const waterColor = mix(u.uOuterWaterColor, u.uInnerWaterColor, waterMix);

  const ring = (distance, radius, thickness) =>
    smoothstep(
      thickness,
      thickness.add(0.005),
      abs(distance.sub(radius))
    ).oneMinus();
  const innerCircle = ring(
    innerDist,
    u.uInnerCircleRadius.add(innerDeformation),
    u.uInnerCircleThickness
  );
  const outerCircle = ring(
    dist,
    u.uOuterCircleRadius.add(outerDeformation),
    u.uOuterCircleThickness
  );

  // Foam rings sit on top of the water gradient
  const color = mix(waterColor, u.uFoamColor, max(innerCircle, outerCircle));
  material.colorNode = vec4(color, 0.7);

  return material;
};

// Glowing fish with a traveling tail wiggle
const createFishMaterial = u => {
  const material = new THREE.MeshStandardNodeMaterial();

  const p = positionGeometry;
  // 0 at the head, 1 at the tail tip
  const bodyFactor = clamp(
    float(FISH_HEAD_Z)
      .sub(p.z)
      .div(FISH_HEAD_Z - FISH_TAIL_Z),
    0,
    1
  );
  // Amplitude envelope: small but non-zero at the head, largest at the tail
  const envelope = mix(FISH_HEAD_AMPLITUDE, 1, pow(bodyFactor, 1.6));
  // Per-fish phase so the two don't swish in sync: two plain meshes (a
  // positionNode replaces the instancing transform in three r186), each
  // feeding its own userData.fishPhase as the draw happens
  const phase = uniform(0).onObjectUpdate(
    ({ object }) => object.userData.fishPhase
  );
  // Traveling wave: the tail lags the head, so the head is already swinging
  // back (counter-phase recoil) while the tail finishes its sweep
  const bendAngle = sin(
    time.mul(u.uWiggleSpeed).add(phase).sub(bodyFactor.mul(FISH_WAVE_TRAVEL))
  )
    .mul(u.uDeformationStrength)
    .mul(envelope);

  // Rotate each vertex around Y about the pivot; the per-vertex angle curls
  // the body into an arc while keeping its length
  const c = cos(bendAngle);
  const s = sin(bendAngle);
  const zFromPivot = p.z.sub(FISH_PIVOT_Z);
  material.positionNode = vec3(
    p.x.mul(c).add(zFromPivot.mul(s)),
    p.y,
    zFromPivot.mul(c).sub(p.x.mul(s)).add(FISH_PIVOT_Z)
  );

  return material;
};

const Well = () => {
  const bigFishRef = useRef(null);
  const smallFishRef = useRef(null);

  const { nodes: fishNodes } = useGLTF(fishModel);

  const perlinNoiseTexture = useVoronoiPerlinTexture();

  const wellUniforms = useMemo(
    () => ({
      uOuterWaterColor: uniform(new THREE.Color(OUTER_WATER_COLOR)),
      uInnerWaterColor: uniform(new THREE.Color(INNER_WATER_COLOR)),
      uFoamColor: uniform(new THREE.Color(FOAM_COLOR)),
      uInnerCircleRadius: uniform(INNER_CIRCLE_RADIUS),
      uInnerCircleThickness: uniform(INNER_CIRCLE_THICKNESS),
      uInnerCircleOffset: uniform(
        new THREE.Vector2(INNER_CIRCLE_OFFSET_X, INNER_CIRCLE_OFFSET_Y)
      ),
      uOuterCircleRadius: uniform(OUTER_CIRCLE_RADIUS),
      uOuterCircleThickness: uniform(OUTER_CIRCLE_THICKNESS),
      uInnerPerlinStrength: uniform(INNER_PERLIN_STRENGTH),
      uOuterPerlinStrength: uniform(OUTER_PERLIN_STRENGTH),
    }),
    []
  );

  const fishUniforms = useMemo(
    () => ({
      uDeformationStrength: uniform(FISH_DEFORMATION_STRENGTH),
      uWiggleSpeed: uniform(FISH_WIGGLE_SPEED),
    }),
    []
  );

  const wellMaterial = useMemo(
    () => createWellMaterial(wellUniforms, perlinNoiseTexture),
    [wellUniforms, perlinNoiseTexture]
  );
  const fishMaterial = useMemo(
    () => createFishMaterial(fishUniforms),
    [fishUniforms]
  );

  useEffect(() => () => wellMaterial.dispose(), [wellMaterial]);
  useEffect(() => () => fishMaterial.dispose(), [fishMaterial]);

  const controls = useControls(
    'Well',
    {
      foamColor: {
        value: FOAM_COLOR,
        onChange: value => {
          wellUniforms.uFoamColor.value.set(value);
        },
      },
      outerWaterColor: {
        value: OUTER_WATER_COLOR,
        onChange: value => {
          wellUniforms.uOuterWaterColor.value.set(value);
        },
      },
      innerWaterColor: {
        value: INNER_WATER_COLOR,
        onChange: value => {
          wellUniforms.uInnerWaterColor.value.set(value);
        },
      },
      innerCircleRadius: {
        value: INNER_CIRCLE_RADIUS,
        min: 0,
        max: 0.7,
        step: 0.001,
        onChange: value => {
          wellUniforms.uInnerCircleRadius.value = value;
        },
      },
      innerCircleThickness: {
        value: INNER_CIRCLE_THICKNESS,
        min: 0,
        max: 0.3,
        step: 0.001,
        onChange: value => {
          wellUniforms.uInnerCircleThickness.value = value;
        },
      },
      outerCircleRadius: {
        value: OUTER_CIRCLE_RADIUS,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: value => {
          wellUniforms.uOuterCircleRadius.value = value;
        },
      },
      outerCircleThickness: {
        value: OUTER_CIRCLE_THICKNESS,
        min: 0,
        max: 0.3,
        step: 0.001,
        onChange: value => {
          wellUniforms.uOuterCircleThickness.value = value;
        },
      },
      innerCircleOffsetX: {
        value: INNER_CIRCLE_OFFSET_X,
        min: -0.5,
        max: 0.5,
        step: 0.001,
        onChange: value => {
          wellUniforms.uInnerCircleOffset.value.x = value;
        },
      },
      innerCircleOffsetY: {
        value: INNER_CIRCLE_OFFSET_Y,
        min: -0.5,
        max: 0.5,
        step: 0.001,
        onChange: value => {
          wellUniforms.uInnerCircleOffset.value.y = value;
        },
      },
      perlinStrengthInner: {
        value: INNER_PERLIN_STRENGTH,
        min: 0,
        max: 0.2,
        step: 0.001,
        onChange: value => {
          wellUniforms.uInnerPerlinStrength.value = value;
        },
      },
      perlinStrengthOuter: {
        value: OUTER_PERLIN_STRENGTH,
        min: 0,
        max: 0.2,
        step: 0.001,
        onChange: value => {
          wellUniforms.uOuterPerlinStrength.value = value;
        },
      },
      posX: { value: 15.45, min: 10, max: 20, step: 0.01 },
      posY: { value: -1.82, min: -5, max: 2, step: 0.01 },
      posZ: { value: 11.2, min: 6, max: 16, step: 0.01 },
      radius: { value: 1.48, min: 0.1, max: 5, step: 0.01 },
      fishColor: {
        value: FISHES_COLOR,
      },
      fishIntensity: {
        value: FISHES_INTENSITY,
        min: 0,
        max: 20,
        step: 0.01,
      },
      fishMovementStrength: {
        value: 1,
        min: 0,
        max: 2,
        step: 0.01,
      },
      fishDeformationStrength: {
        value: FISH_DEFORMATION_STRENGTH,
        min: 0,
        max: 1.5,
        step: 0.01,
        onChange: value => {
          fishUniforms.uDeformationStrength.value = value;
        },
      },
      fishWiggleSpeed: {
        value: FISH_WIGGLE_SPEED,
        min: 0,
        max: 15,
        step: 0.1,
        onChange: value => {
          fishUniforms.uWiggleSpeed.value = value;
        },
      },
    },
    { collapsed: true }
  );

  useEffect(() => {
    fishMaterial.color.set(controls.fishColor);
    fishMaterial.emissive.set(controls.fishColor);
    fishMaterial.emissiveIntensity = controls.fishIntensity;
  }, [fishMaterial, controls.fishColor, controls.fishIntensity]);

  useFrame(({ elapsed }) => {
    // Big fish
    const bigAmplitude = BIG_FISH_AMPLITUDE * controls.fishMovementStrength;
    bigFishRef.current.rotation.y = -elapsed * FISHES_SPEED - Math.PI / 2;
    bigFishRef.current.position.x =
      Math.sin(-elapsed * FISHES_SPEED) * bigAmplitude;
    bigFishRef.current.position.z =
      Math.cos(-elapsed * FISHES_SPEED) * bigAmplitude;

    // Small fish
    const smallAmplitude = SMALL_FISH_AMPLITUDE * controls.fishMovementStrength;
    smallFishRef.current.rotation.y =
      -elapsed * FISHES_SPEED + SMALL_FISH_OFFSET - Math.PI / 2;

    smallFishRef.current.position.x =
      Math.sin(-elapsed * FISHES_SPEED + SMALL_FISH_OFFSET) * smallAmplitude;
    smallFishRef.current.position.z =
      Math.cos(-elapsed * FISHES_SPEED + SMALL_FISH_OFFSET) * smallAmplitude;
  });

  return (
    <>
      <mesh
        name="Well"
        position={[controls.posX, controls.posY, controls.posZ]}
        rotation-x={-Math.PI / 2}
        scale={controls.radius}
      >
        <circleGeometry args={[1, 48]} />
        <primitive object={wellMaterial} attach="material" />
      </mesh>
      <group position={[15.45, -2.11, 11.2]}>
        <mesh
          ref={bigFishRef}
          geometry={fishNodes.Fish.geometry}
          material={fishMaterial}
          scale={0.089}
          userData={{ fishPhase: 0 }}
        />
        <mesh
          ref={smallFishRef}
          geometry={fishNodes.Fish.geometry}
          material={fishMaterial}
          scale={0.0667}
          userData={{ fishPhase: 2.4 }}
        />
      </group>
    </>
  );
};

useGLTF.preload(fishModel);

export { Well };
