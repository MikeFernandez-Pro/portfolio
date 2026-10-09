// One-off edits of the island.glb geometry, applied once at load (each one
// flags its geometry so a remount doesn't apply it twice)

/**
 * The pot bubbles are visible at rest in the base geometry (their morph
 * animation is zeroed in Islands' filtered clips): identify their vertices
 * through the potBubbles morph deltas — only bubble vertices have non-zero
 * ones — and shove them far below the island.
 */
export const hidePotBubbles = nodes => {
  const potBubblesIndex = nodes.island_1.morphTargetDictionary.potBubbles;

  Object.values(nodes).forEach(node => {
    const geometry = node.geometry;
    const bubbleDeltas = geometry?.morphAttributes?.position?.[potBubblesIndex];
    if (!bubbleDeltas || geometry.userData.potBubblesHidden) return;

    const position = geometry.attributes.position;
    for (let i = 0; i < bubbleDeltas.count; i++) {
      if (
        bubbleDeltas.getX(i) !== 0 ||
        bubbleDeltas.getY(i) !== 0 ||
        bubbleDeltas.getZ(i) !== 0
      ) {
        position.setY(i, position.getY(i) - 30);
      }
    }
    position.needsUpdate = true;
    geometry.userData.potBubblesHidden = true;
  });
};

/**
 * The old Vercel sign quads are baked into the signs primitive together with
 * the mail and LinkedIn ones, but they sit apart at x > -3 in geometry space:
 * shove them below the island, XSign renders an X logo in their place.
 */
export const hideVercelSign = nodes => {
  const geometry = nodes.island_15.geometry;
  if (geometry.userData.vercelSignHidden) return;

  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    if (position.getX(i) > -3) {
      position.setY(i, position.getY(i) - 30);
    }
  }
  position.needsUpdate = true;
  geometry.userData.vercelSignHidden = true;
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
