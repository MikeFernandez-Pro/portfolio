import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei/webgpu';
import * as THREE from 'three/webgpu';
import {
  abs,
  cameraPosition,
  clamp,
  dot,
  float,
  max,
  mix,
  normalWorldGeometry,
  normalize,
  positionGeometry,
  positionWorld,
  pow,
  smoothstep,
  step,
  uniform,
  uv,
  varying,
  vec3,
} from 'three/tsl';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

import { useControls } from '#utils/useControls.jsx';

import windowRayModel from '#assets/models/island/windowRay.glb?url';

const RAY_COLOR = '#f2b183';
const RAY_OPACITY = 0.5;
const RAY_START = 1;
const RAY_END = 0.36;
const RAY_SMOOTHNESS = 5;
const RAY_EDGE_SMOOTHNESS = 0.01;
const RAY_ANGLE_FADE_STRENGTH = 0.7;
const RAY_ANGLE_FADE_POWER = 1.5;

// Beam end-cap centers in model space, measured from the mesh — the side
// quads are unwrapped in mixed directions (uv.y runs window-to-ground on
// some faces and ground-to-window on others), so the along-beam coordinate
// has to come from the vertex position instead of uv.y
const WINDOW_END_CENTER = [-19.283, -0.941, 3.039];
const GROUND_END_CENTER = [-22.603, -1.883, 6.543];

const WindowRay = () => {
  const { nodes } = useGLTF(windowRayModel);

  // Shade smooth: the GLB ships flat (split) normals, useless for the
  // view-angle fade. The UVs differ per face so mergeVertices alone can't
  // weld across them — weld a copy stripped of uv/normal, rebuild smooth
  // normals on it, then copy them back onto the original (UV'd) layout by
  // matching vertex positions
  const geometry = useMemo(() => {
    const source = nodes.windowRay.geometry;

    const stripped = source.clone();
    stripped.deleteAttribute('uv');
    stripped.deleteAttribute('normal');
    const welded = mergeVertices(stripped);
    welded.computeVertexNormals();

    const positionKey = (attribute, i) =>
      `${attribute.getX(i).toFixed(4)},${attribute.getY(i).toFixed(4)},${attribute.getZ(i).toFixed(4)}`;

    const weldedIndexByPosition = new Map();
    for (let i = 0; i < welded.attributes.position.count; i++) {
      weldedIndexByPosition.set(positionKey(welded.attributes.position, i), i);
    }

    const smooth = source.clone();
    const normalAttribute = smooth.attributes.normal;
    for (let i = 0; i < smooth.attributes.position.count; i++) {
      const j = weldedIndexByPosition.get(
        positionKey(smooth.attributes.position, i)
      );
      if (j !== undefined) {
        normalAttribute.setXYZ(
          i,
          welded.attributes.normal.getX(j),
          welded.attributes.normal.getY(j),
          welded.attributes.normal.getZ(j)
        );
      }
    }
    normalAttribute.needsUpdate = true;
    return smooth;
  }, [nodes]);

  const { material, uniforms } = useMemo(() => {
    const uniforms = {
      uColor: uniform(new THREE.Color(RAY_COLOR)),
      uOpacity: uniform(RAY_OPACITY),
      uStart: uniform(RAY_START),
      uEnd: uniform(RAY_END),
      uSmoothness: uniform(RAY_SMOOTHNESS),
      uEdgeSmoothness: uniform(RAY_EDGE_SMOOTHNESS),
      uAngleFadeStrength: uniform(RAY_ANGLE_FADE_STRENGTH),
      uAngleFadePower: uniform(RAY_ANGLE_FADE_POWER),
    };

    const material = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // 1 at the window extremity, 0 at the ground one
    const windowEnd = vec3(...WINDOW_END_CENTER);
    const rayAxis = vec3(...GROUND_END_CENTER).sub(windowEnd);
    const rayCoord = varying(
      float(1).sub(
        clamp(
          dot(positionGeometry.sub(windowEnd), rayAxis).div(
            dot(rayAxis, rayAxis)
          ),
          0,
          1
        )
      ),
      'vRayCoord'
    );

    // 0 at uStart (ray coord 1, window end, full opacity) down to 1 at uEnd
    // (ray coord 0, ground end). uSmoothness shapes the falloff (1 = linear,
    // higher = fades sooner, lower = longer bright core)
    const progress = clamp(
      uniforms.uStart.sub(rayCoord).div(uniforms.uStart.sub(uniforms.uEnd)),
      0,
      1
    );
    const ray = pow(progress.oneMinus(), uniforms.uSmoothness)
      // Clip outside [uEnd, uStart] so the sliders shrink the ray from its
      // extremities instead of just moving the fade zone
      .mul(step(rayCoord, uniforms.uStart))
      .mul(step(uniforms.uEnd, rayCoord));

    // Soften the ray sides
    const edges = smoothstep(0, uniforms.uEdgeSmoothness, uv().x).mul(
      smoothstep(uniforms.uEdgeSmoothness.oneMinus(), 1, uv().x).oneMinus()
    );

    // View-angle fade: faces seen edge-on melt away instead of drawing the
    // volume's hard corners (abs: the material is DoubleSide). Relies on the
    // smoothed normals so the fade wraps continuously around the beam
    const facing = abs(
      dot(
        normalize(normalWorldGeometry),
        normalize(cameraPosition.sub(positionWorld))
      )
    );
    const angleFade = pow(facing, max(uniforms.uAngleFadePower, 0.0001));
    const angles = mix(1, angleFade, uniforms.uAngleFadeStrength);

    material.colorNode = uniforms.uColor;
    material.opacityNode = ray.mul(edges).mul(angles).mul(uniforms.uOpacity);

    return { material, uniforms };
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useControls(
    'WindowRay',
    {
      color: {
        value: RAY_COLOR,
        onChange: value => {
          uniforms.uColor.value.set(value);
        },
      },
      opacity: {
        value: RAY_OPACITY,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          uniforms.uOpacity.value = value;
        },
      },
      start: {
        value: RAY_START,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          uniforms.uStart.value = value;
        },
      },
      end: {
        value: RAY_END,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          uniforms.uEnd.value = value;
        },
      },
      smoothness: {
        value: RAY_SMOOTHNESS,
        min: 0.1,
        max: 5,
        step: 0.01,
        onChange: value => {
          uniforms.uSmoothness.value = value;
        },
      },
      edgeSmoothness: {
        value: RAY_EDGE_SMOOTHNESS,
        min: 0.01,
        max: 0.5,
        step: 0.01,
        onChange: value => {
          uniforms.uEdgeSmoothness.value = value;
        },
      },
      // View-angle fade hiding the beam's hard corners: strength blends the
      // effect in (0 = off), power shapes how fast grazing faces melt away
      angleFadeStrength: {
        value: RAY_ANGLE_FADE_STRENGTH,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          uniforms.uAngleFadeStrength.value = value;
        },
      },
      angleFadePower: {
        value: RAY_ANGLE_FADE_POWER,
        min: 0.1,
        max: 8,
        step: 0.01,
        onChange: value => {
          uniforms.uAngleFadePower.value = value;
        },
      },
    },
    { collapsed: true, reset: true }
  );

  return <mesh geometry={geometry} material={material} />;
};

useGLTF.preload(windowRayModel);

export { WindowRay };
