import * as THREE from 'three/webgpu';

// One-off edits of the island.glb geometry, applied once at load (each one
// flags its geometry so a remount doesn't apply it twice)

const movesVertex = (deltas, i) =>
  deltas.getX(i) !== 0 || deltas.getY(i) !== 0 || deltas.getZ(i) !== 0;

// Copy of `geometry` holding only the given triangles (and the vertices they
// use), with its morph targets or not
const subsetGeometry = (geometry, triangles, { skinned }) => {
  const index = geometry.index;
  const remap = new Int32Array(geometry.attributes.position.count).fill(-1);
  const vertices = [];
  const indices = new Uint32Array(triangles.length * 3);
  triangles.forEach((triangle, t) => {
    for (let corner = 0; corner < 3; corner++) {
      const vertex = index.getX(triangle * 3 + corner);
      if (remap[vertex] === -1) {
        remap[vertex] = vertices.length;
        vertices.push(vertex);
      }
      indices[t * 3 + corner] = remap[vertex];
    }
  });

  // Raw array values (getComponent would denormalize normalized ones)
  const copy = attribute => {
    const { itemSize } = attribute;
    const interleaved = attribute.isInterleavedBufferAttribute;
    const source = interleaved ? attribute.data.array : attribute.array;
    const stride = interleaved ? attribute.data.stride : itemSize;
    const offset = interleaved ? attribute.offset : 0;
    const array = new source.constructor(vertices.length * itemSize);
    vertices.forEach((vertex, v) => {
      for (let c = 0; c < itemSize; c++) {
        array[v * itemSize + c] = source[vertex * stride + offset + c];
      }
    });
    return new THREE.BufferAttribute(array, itemSize, attribute.normalized);
  };

  const subset = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    if (!skinned && (name === 'skinIndex' || name === 'skinWeight')) continue;
    subset.setAttribute(name, copy(attribute));
  }
  subset.setIndex(
    new THREE.BufferAttribute(
      vertices.length > 65535 ? indices : new Uint16Array(indices),
      1
    )
  );
  if (skinned) {
    for (const [name, targets] of Object.entries(geometry.morphAttributes)) {
      subset.morphAttributes[name] = targets.map(copy);
    }
    subset.morphTargetsRelative = geometry.morphTargetsRelative;
  }
  subset.computeBoundingBox();
  subset.computeBoundingSphere();
  return subset;
};

/**
 * Splits the island_1 terrain (115k vertices, 17 morph targets) by what moves:
 * - the ~6% of its triangles that a morph target or a moving joint (hammer,
 *   anvil sword, pot, portal) touches stay in island_1, still skinned and
 *   morphed, so the `details` track, ForgeLavaPlane's bellows weight and
 *   every morph keep binding to it by name and index;
 * - the rest becomes a plain static geometry (returned): its vertices are
 *   bound only to neutral_bone, which never moves and whose bind pose is the
 *   identity in island space, so they render where they are stored;
 * - the pot bubbles (vertices moved by the potBubbles target, whose weight
 *   the scene never raises) are dropped.
 * Morphs and skinning then run on ~7k vertices instead of 115k, and the morph
 * texture shrinks with them.
 */
export const splitIslandTerrain = nodes => {
  const node = nodes.island_1;
  if (node.userData.staticTerrain) return node.userData.staticTerrain;

  const geometry = node.geometry;
  const targets = geometry.morphAttributes.position;
  const potBubbles = targets[node.morphTargetDictionary.potBubbles];
  const neutralBone = node.skeleton.bones.findIndex(
    bone => bone.name === 'neutral_bone'
  );
  const { skinIndex, skinWeight } = geometry.attributes;

  // Per vertex: 0 static, 1 moving, 2 pot bubble
  const STATIC = 0;
  const MOVING = 1;
  const BUBBLE = 2;
  const kinds = new Uint8Array(geometry.attributes.position.count);
  for (let i = 0; i < kinds.length; i++) {
    if (movesVertex(potBubbles, i)) {
      kinds[i] = BUBBLE;
      continue;
    }
    let moving = targets.some(deltas => movesVertex(deltas, i));
    for (let k = 0; k < 4 && !moving; k++) {
      moving =
        skinWeight.getComponent(i, k) > 0 &&
        skinIndex.getComponent(i, k) !== neutralBone;
    }
    kinds[i] = moving ? MOVING : STATIC;
  }

  const staticTriangles = [];
  const movingTriangles = [];
  const index = geometry.index;
  for (let t = 0; t < index.count / 3; t++) {
    let kind = STATIC;
    for (let corner = 0; corner < 3; corner++) {
      kind = Math.max(kind, kinds[index.getX(t * 3 + corner)]);
    }
    if (kind === STATIC) staticTriangles.push(t);
    else if (kind === MOVING) movingTriangles.push(t);
  }

  const staticTerrain = subsetGeometry(geometry, staticTriangles, {
    skinned: false,
  });
  node.geometry = subsetGeometry(geometry, movingTriangles, { skinned: true });
  geometry.dispose();
  node.userData.staticTerrain = staticTerrain;
  return staticTerrain;
};

/**
 * Drops the morph targets of the island.glb primitives they don't move
 * (every delta zero): those meshes skip the morph texture and loop. Their
 * morphTargetInfluences stay, so the `details` track still binds.
 */
export const dropEmptyMorphTargets = nodes => {
  Object.values(nodes).forEach(node => {
    const targets = node.geometry?.morphAttributes?.position;
    if (!targets || node === nodes.island_1) return;
    const moves = targets.some(deltas => {
      for (let i = 0; i < deltas.count; i++) {
        if (movesVertex(deltas, i)) return true;
      }
      return false;
    });
    if (!moves) node.geometry.morphAttributes = {};
  });
};

/**
 * The old Vercel sign quads are baked into the signs primitive together with
 * the mail and LinkedIn ones, but they sit apart at x > -3 in geometry space:
 * drop their triangles, XSign renders an X logo in their place.
 */
export const dropVercelSign = nodes => {
  const node = nodes.island_15;
  if (node.userData.vercelSignDropped) return;

  const geometry = node.geometry;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const kept = [];
  for (let t = 0; t < index.count / 3; t++) {
    let sign = false;
    for (let corner = 0; corner < 3 && !sign; corner++) {
      sign = position.getX(index.getX(t * 3 + corner)) > -3;
    }
    if (!sign) kept.push(t);
  }

  node.geometry = subsetGeometry(geometry, kept, { skinned: true });
  geometry.dispose();
  node.userData.vercelSignDropped = true;
};

/**
 * Candle flame tips, in island space: the candles primitive's vertices
 * clustered by XZ proximity, one point at each cluster's top.
 */
export const candleFlamePositions = nodes => {
  const position = nodes.island_5.geometry.attributes.position;
  const clusters = [];
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);

    let cluster = clusters.find(
      c => Math.hypot(c.sumX / c.n - x, c.sumZ / c.n - z) < 0.8
    );
    if (!cluster) {
      cluster = { sumX: 0, sumZ: 0, n: 0, maxY: -Infinity };
      clusters.push(cluster);
    }
    cluster.sumX += x;
    cluster.sumZ += z;
    cluster.n += 1;
    if (y > cluster.maxY) cluster.maxY = y;
  }
  return clusters.map(c => [c.sumX / c.n, c.maxY, c.sumZ / c.n]);
};
