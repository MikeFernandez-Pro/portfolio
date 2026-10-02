import gsap from 'gsap';

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

// Snapshot for things wired once at init (shader uniforms, ambient loops):
// they never rebuild, so they read the preference at load.
export const REDUCED_MOTION_AT_LOAD = window.matchMedia(REDUCE_QUERY).matches;

// Live flag for sequences created on demand (intro reveal, camera pan) —
// gsap.matchMedia keeps it current if the OS preference flips mid-session.
let reducedMotionLive = REDUCED_MOTION_AT_LOAD;
gsap.matchMedia().add(REDUCE_QUERY, () => {
  reducedMotionLive = true;
  return () => {
    reducedMotionLive = false;
  };
});

export const prefersReducedMotion = () => reducedMotionLive;
