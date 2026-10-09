// Transform of the island group: every island.glb node, and every island
// sensor GLB, is authored in this space
export const ISLAND_POSITION = [-1.35, 2.25, -15];
export const ISLAND_SCALE = 0.45;

// Island-space point -> world space
export const islandToWorld = ([x, y, z]) => [
  x * ISLAND_SCALE + ISLAND_POSITION[0],
  y * ISLAND_SCALE + ISLAND_POSITION[1],
  z * ISLAND_SCALE + ISLAND_POSITION[2],
];
