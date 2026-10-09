// PROTOTYPE (skills TextGeometry) - throwaway, lives on the
// prototype/skills-textgeometry branch only. Not production code.
//
// Question: can the baked floating skill words (island_11, a texture-atlas
// strip) be replaced by Metamorphous TextGeometry, all five words in ONE
// BatchedMesh (1 draw call), with each word's text editable live?
//
// Mounted in place of FloatingSkills. Debug panel + overlay: add #debug.
// The "Skills (prototype)" Tweakpane folder holds the five words and the
// geometry settings; the overlay bottom-left shows the batch state.
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import gsap from 'gsap';

import { useControls } from '#utils/useControls.jsx';
import { DEBUG_ENABLED } from '#utils/debug.js';
import { useStore } from '#store/ZustandStorage.jsx';
import fontJson from '#assets/fonts/metamorphous.typeface.prototype.json';

const FONT = new Font(fontJson);

// The five baked word planes of island_11 (island-local space, measured from
// island.glb): plane center and facing normal. Each original plane is
// 2 x 0.517 units, text read along the plane's local +x.
const SLOTS = [
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

const SLOT_MATRICES = SLOTS.map(({ center, normal: [nx, nz] }) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(...center),
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.atan2(nx, nz)
    ),
    new THREE.Vector3(1, 1, 1)
  )
);

const SAMPLE_WORDS = [
  'GSAP',
  'GLSL',
  'WebGL',
  'WebGPU',
  'TypeScript',
  'Node',
  'Vite',
  'R3F',
  'Houdini',
  'Rapier',
  'Shaders',
  'Tweakpane',
  'Howler',
  'CSS',
];

// Minimum per-word vertex reservation. A word that outgrows its reservation
// forces a full BatchedMesh rebuild (counted in the overlay)
const MIN_RESERVE = 4096;

// Gentle world-space wave over the letters (same as the baked skills).
// positionLocal already carries the BatchedMesh per-word transform; the
// wave is applied after the model matrix, so it replaces the whole
// projection (vertexNode)
const wavingVertex = localPosition => {
  const world = modelWorldMatrix.mul(vec4(localPosition, 1));
  const y1 = world.y.add(sin(world.x.mul(10).add(time)).mul(0.02));
  const y2 = y1.add(sin(y1.mul(0.5).add(time)).mul(0.01));
  return cameraProjectionMatrix.mul(
    cameraViewMatrix.mul(vec4(world.x, y2, world.z, 1))
  );
};

// Cap-height of the font at size 1, to sit every word on the same baseline
// with its capitals vertically centered on the original plane
const CAP_HEIGHT = (() => {
  const g = new TextGeometry('H', { font: FONT, size: 1, depth: 0 });
  g.computeBoundingBox();
  const h = g.boundingBox.max.y;
  g.dispose();
  return h;
})();

function makeWordGeometry(text, { size, depth, curveSegments }) {
  const geometry = new TextGeometry(text || ' ', {
    font: FONT,
    size,
    depth,
    curveSegments,
    bevelEnabled: false,
  });
  // Unlit flat color: only positions are needed in the batch
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const width = box.isEmpty() ? 0 : box.max.x - box.min.x;
  geometry.translate(
    box.isEmpty() ? 0 : -(box.min.x + box.max.x) / 2,
    -(CAP_HEIGHT * size) / 2,
    -depth / 2
  );
  return { geometry, width };
}

function createBatch(words, settings, material) {
  const built = words.map(word => makeWordGeometry(word, settings));
  const reserves = built.map(({ geometry }) =>
    Math.max(MIN_RESERVE, geometry.attributes.position.count * 2)
  );
  const mesh = new THREE.BatchedMesh(
    SLOTS.length,
    reserves.reduce((sum, r) => sum + r, 0),
    undefined,
    material
  );
  mesh.name = 'floatingSkillsText (PROTOTYPE)';
  // Transparent words never overlap each other; skip per-frame sorting
  mesh.sortObjects = false;
  const slots = built.map(({ geometry, width }, index) => {
    const geometryId = mesh.addGeometry(geometry, reserves[index]);
    const instanceId = mesh.addInstance(geometryId);
    mesh.setMatrixAt(instanceId, SLOT_MATRICES[index]);
    const vertexCount = geometry.attributes.position.count;
    geometry.dispose();
    return { geometryId, reserve: reserves[index], vertexCount, width };
  });
  return { mesh, slots };
}

const FloatingSkillsTextPrototype = props => {
  const { island } = props;

  const { material, uniforms } = useMemo(() => {
    const uniforms = {
      uOpacity: uniform(0),
      uColor: uniform(new THREE.Color('#e1754b')),
      uIntensity: uniform(9.87),
    };
    const material = new THREE.MeshBasicNodeMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    material.vertexNode = wavingVertex(positionLocal);
    material.colorNode = vec4(
      uniforms.uColor.mul(uniforms.uIntensity),
      uniforms.uOpacity
    );
    return { material, uniforms };
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  const [words, setWords] = useState(() => SLOTS.map(slot => slot.word));
  const wordsRef = useRef(words);
  wordsRef.current = words;

  const { size, depth, curveSegments, showOriginal, forceVisible } =
    useControls('Skills (prototype)', {
      size: { value: 0.24, min: 0.05, max: 1, step: 0.005 },
      depth: { value: 0.02, min: 0, max: 0.3, step: 0.005 },
      curveSegments: { value: 4, min: 1, max: 12, step: 1 },
      showOriginal: false,
      forceVisible: false,
      ...Object.fromEntries(
        SLOTS.map((slot, index) => [
          `word${index + 1}`,
          {
            value: slot.word,
            onChange: value =>
              setWords(previous => {
                const next = [...previous];
                next[index] = value;
                return next;
              }),
          },
        ])
      ),
      color: {
        value: '#e1754b',
        onChange: value => uniforms.uColor.value.set(value),
      },
      intensity: {
        value: 9.87,
        min: 0,
        max: 20,
        step: 0.01,
        onChange: value => (uniforms.uIntensity.value = value),
      },
      'randomize one word': () => {
        const index = Math.floor(Math.random() * SLOTS.length);
        const word =
          SAMPLE_WORDS[Math.floor(Math.random() * SAMPLE_WORDS.length)];
        setWords(previous => {
          const next = [...previous];
          next[index] = word;
          return next;
        });
      },
      'overflow test (long word)': () =>
        setWords(previous => [
          previous[0],
          previous[1],
          'Supercalifragilistic',
          previous[3],
          previous[4],
        ]),
    });

  const settings = useMemo(
    () => ({ size, depth, curveSegments }),
    [size, depth, curveSegments]
  );

  // The batch itself. Rebuilt from scratch only when the geometry settings
  // change or a word outgrows its reserved vertex range
  const [batch, setBatch] = useState(() => {
    const initial = createBatch(words, settings, material);
    initial.settings = settings;
    return initial;
  });
  const statsRef = useRef({ rebuilds: 0, lastUpdateMs: 0, lastAction: 'init' });

  useEffect(() => {
    if (batch.settings === settings) return;
    const t0 = performance.now();
    const next = createBatch(wordsRef.current, settings, material);
    next.settings = settings;
    statsRef.current = {
      rebuilds: statsRef.current.rebuilds + 1,
      lastUpdateMs: performance.now() - t0,
      lastAction: 'settings changed -> full rebuild',
    };
    setBatch(next);
  }, [settings]);

  useEffect(() => () => batch.mesh.dispose(), [batch]);

  // Live text edits: rewrite just the changed word in place
  const appliedWordsRef = useRef(words);
  useEffect(() => {
    const applied = appliedWordsRef.current;
    appliedWordsRef.current = words;
    if (applied === words) return;
    const t0 = performance.now();
    let overflow = false;
    const changed = [];
    words.forEach((word, index) => {
      if (word === applied[index]) return;
      changed.push(index + 1);
      const { geometry, width } = makeWordGeometry(word, settings);
      const slot = batch.slots[index];
      if (geometry.attributes.position.count > slot.reserve) {
        overflow = true;
      } else {
        batch.mesh.setGeometryAt(slot.geometryId, geometry);
        slot.vertexCount = geometry.attributes.position.count;
        slot.width = width;
      }
      geometry.dispose();
    });
    if (changed.length === 0) return;
    if (overflow) {
      const next = createBatch(words, settings, material);
      next.settings = settings;
      statsRef.current = {
        rebuilds: statsRef.current.rebuilds + 1,
        lastUpdateMs: performance.now() - t0,
        lastAction: `word ${changed} overflowed its reserve -> full rebuild`,
      };
      setBatch(next);
    } else {
      statsRef.current = {
        ...statsRef.current,
        lastUpdateMs: performance.now() - t0,
        lastAction: `setGeometryAt word ${changed} (in place)`,
      };
    }
  }, [words]);

  // Opacity: same activation as the baked skills, or forced on
  useEffect(() => {
    if (forceVisible) {
      uniforms.uOpacity.value = 1;
      return;
    }
    uniforms.uOpacity.value = 0;
    const activation = gsap.to(uniforms.uOpacity, {
      duration: 1,
      delay: 1,
      value: 1,
      ease: 'expo.in',
      paused: true,
    });
    if (useStore.getState().magicGlyphActivation) activation.play();
    const unsub = useStore.subscribe(
      state => state.magicGlyphActivation,
      () => activation.play()
    );
    return () => {
      activation.kill();
      unsub();
    };
  }, [forceVisible]);

  // Surface the state: fixed overlay, rewritten whenever anything changes
  const overlayRef = useRef(null);
  useEffect(() => {
    if (!DEBUG_ENABLED) return;
    const element = document.createElement('pre');
    element.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:9999;margin:0;padding:8px 10px;' +
      'background:rgba(0,0,0,.75);color:#ffd9c8;font:11px/1.4 monospace;' +
      'pointer-events:none;border:1px solid #e1754b;border-radius:4px';
    document.body.appendChild(element);
    overlayRef.current = element;
    return () => element.remove();
  }, []);

  useEffect(() => {
    if (!overlayRef.current) return;
    const { slots, mesh } = batch;
    const used = slots.reduce((sum, slot) => sum + slot.vertexCount, 0);
    const reserved = slots.reduce((sum, slot) => sum + slot.reserve, 0);
    const lines = slots.map(
      (slot, index) =>
        `${index + 1} ${JSON.stringify(words[index]).padEnd(24)} ` +
        `${String(slot.vertexCount).padStart(6)} / ${String(slot.reserve).padEnd(6)} verts  ` +
        `width ${slot.width.toFixed(2)}${slot.width > 2 ? ' (> original 2.00 plane)' : ''}`
    );
    const stats = statsRef.current;
    overlayRef.current.textContent = [
      'PROTOTYPE  skills TextGeometry -> 1 BatchedMesh',
      ...lines,
      `total ${used} / ${reserved} verts (${(mesh.geometry.attributes.position.array.byteLength / 1024).toFixed(0)} KB positions)`,
      `size ${size}  depth ${depth}  curveSegments ${curveSegments}`,
      `last: ${stats.lastAction}  ${stats.lastUpdateMs.toFixed(1)} ms`,
      `full rebuilds: ${stats.rebuilds}   draw calls: 1`,
    ].join('\n');
  });

  return (
    <>
      <primitive object={batch.mesh} />
      {showOriginal && (
        <skinnedMesh
          name="island_11 (original, for comparison)"
          geometry={island.nodes.island_11.geometry}
          skeleton={island.nodes.island_11.skeleton}
          morphTargetDictionary={island.nodes.island_11.morphTargetDictionary}
          morphTargetInfluences={island.nodes.island_11.morphTargetInfluences}
        >
          <meshBasicMaterial
            map={island.materials.magicLetters.map}
            transparent
            opacity={0.6}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </skinnedMesh>
      )}
    </>
  );
};

export { FloatingSkillsTextPrototype };
