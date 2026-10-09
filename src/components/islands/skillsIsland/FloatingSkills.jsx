import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import {
  cameraProjectionMatrix,
  cameraViewMatrix,
  modelWorldMatrix,
  positionLocal,
  sin,
  time,
  uniform,
  vec4,
} from 'three/tsl';
import {
  mergeGeometries,
  mergeVertices,
} from 'three/addons/utils/BufferGeometryUtils.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import gsap from 'gsap';

import { useControls } from '#utils/useControls.jsx';
import { useStore } from '#store/ZustandStorage.jsx';
import fontJson from '#assets/fonts/metamorphous.typeface.json';

// Floating skill words above the skills island, in Metamorphous: flat text
// (ShapeGeometry — TextGeometry with no depth, minus the back cap and the
// zero-area side walls), the five words welded and merged into one geometry
// drawn in one call. They replace the baked atlas strip of island_11.

const FONT = new Font(fontJson);

const TEXT_SIZE = 0.24;
const CURVE_SEGMENTS = 4;
const SKILLS_COLOR = '#e1754b';
const SKILLS_INTENSITY = 9.87;

// The five word slots, where island_11 had its baked word planes
// (island-local space, measured from island.glb): center and facing
// normal (xz), text read along the slot's local +x
const SKILLS = [
  { word: 'WebGL', center: [13.635, 4.383, -45.746], normal: [0.606, 0.795] },
  { word: 'ThreeJs', center: [11.489, 4.383, -43.282], normal: [0.917, 0.399] },
  { word: 'WebGPU', center: [16.865, 4.383, -46.817], normal: [0, 1] },
  {
    word: 'R3F / TSL',
    center: [20.375, 4.383, -45.707],
    normal: [-0.519, 0.855],
  },
  {
    word: 'React / TS',
    center: [22.365, 4.383, -43.273],
    normal: [-0.906, 0.424],
  },
];

const wordGeometry = text => {
  const shapes = FONT.generateShapes(text, TEXT_SIZE);
  const geometry = new THREE.ShapeGeometry(shapes, CURVE_SEGMENTS);
  // Unlit flat color: positions only, so mergeVertices welds every vertex
  // the letter shapes share
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  const welded = mergeVertices(geometry);
  geometry.dispose();
  return welded;
};

// Cap height of the font, to sit every word on the same baseline with its
// capitals vertically centered on the slot
const CAP_HEIGHT = (() => {
  const geometry = wordGeometry('H');
  geometry.computeBoundingBox();
  const height = geometry.boundingBox.max.y;
  geometry.dispose();
  return height;
})();

const buildSkillsGeometry = () => {
  const words = SKILLS.map(({ word, center, normal: [nx, nz] }) => {
    const geometry = wordGeometry(word);
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    geometry.translate(-(min.x + max.x) / 2, -CAP_HEIGHT / 2, 0);
    geometry.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...center),
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          Math.atan2(nx, nz)
        ),
        new THREE.Vector3(1, 1, 1)
      )
    );
    return geometry;
  });

  const merged = mergeGeometries(words);
  words.forEach(geometry => geometry.dispose());
  return merged;
};

const FloatingSkills = () => {
  const { mesh, uniforms } = useMemo(() => {
    const uniforms = {
      uOpacity: uniform(0),
      uColor: uniform(new THREE.Color(SKILLS_COLOR)),
      uIntensity: uniform(SKILLS_INTENSITY),
    };

    // Unlit glow: lights off (the geometry carries no normals)
    const material = new THREE.MeshBasicNodeMaterial({
      lights: false,
      side: THREE.DoubleSide,
      transparent: true,
      // Keep the letters out of the depth buffer so the AO (which samples
      // depth) doesn't darken around them while they are transparent
      depthWrite: false,
    });

    // Gentle world-space wave over the letters, applied after the model
    // matrix: it replaces the whole projection (vertexNode)
    const world = modelWorldMatrix.mul(vec4(positionLocal, 1));
    const y1 = world.y.add(sin(world.x.mul(10).add(time)).mul(0.02));
    const y2 = y1.add(sin(y1.mul(0.5).add(time)).mul(0.01));
    material.vertexNode = cameraProjectionMatrix.mul(
      cameraViewMatrix.mul(vec4(world.x, y2, world.z, 1))
    );
    material.colorNode = vec4(
      uniforms.uColor.mul(uniforms.uIntensity),
      uniforms.uOpacity
    );

    const mesh = new THREE.Mesh(buildSkillsGeometry(), material);
    mesh.name = 'floatingSkills';

    return { mesh, uniforms };
  }, []);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    },
    [mesh]
  );

  useControls('Skills', {
    color: {
      value: SKILLS_COLOR,
      onChange: value => uniforms.uColor.value.set(value),
    },
    intensity: {
      value: SKILLS_INTENSITY,
      min: 0,
      max: 20,
      step: 0.01,
      onChange: value => (uniforms.uIntensity.value = value),
    },
  });

  // Fade in with the magic glyph activation
  useEffect(() => {
    const activation = gsap.to(uniforms.uOpacity, {
      duration: 1,
      delay: 1,
      value: 1,
      ease: 'expo.in',
      paused: true,
    });
    if (useStore.getState().magicGlyphActivation) activation.play();

    const unsubMagicGlyphActivation = useStore.subscribe(
      state => state.magicGlyphActivation,
      () => activation.play()
    );

    return () => {
      activation.kill();
      unsubMagicGlyphActivation();
    };
  }, [uniforms]);

  return <primitive object={mesh} />;
};

export { FloatingSkills };
