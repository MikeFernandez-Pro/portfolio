// Transform of the island group: every island.glb node, and every island
// sensor GLB, is authored in this space
export const ISLAND_POSITION = [-1.35, 2.25, -15];
export const ISLAND_SCALE = 0.45;

// The walkable collider sits slightly above the island group (tuned so the
// feet rest on the visible ground)
const COLLIDER_LIFT = 0.05;
export const ISLAND_COLLIDER_TRANSFORM = {
  position: [
    ISLAND_POSITION[0],
    ISLAND_POSITION[1] + COLLIDER_LIFT,
    ISLAND_POSITION[2],
  ],
  scale: ISLAND_SCALE,
};

// Island-space point -> world space
export const islandToWorld = ([x, y, z]) => [
  x * ISLAND_SCALE + ISLAND_POSITION[0],
  y * ISLAND_SCALE + ISLAND_POSITION[1],
  z * ISLAND_SCALE + ISLAND_POSITION[2],
];
