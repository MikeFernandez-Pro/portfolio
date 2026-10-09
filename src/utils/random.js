// Seeded PRNG (mulberry32): the same seed gives the same layout on every
// load. Returns a function yielding floats in [0, 1).
const mulberry32 = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export { mulberry32 };
