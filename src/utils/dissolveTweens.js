// The voronoi lava dissolve phases shared by the death, the respawn and the
// magic books. `u` holds the dissolve uniforms (uProgress, uThickness).

/** The lava grows in (power1.out) while its edge thickens to `thickness`. */
export const addDissolveGrow = (tl, u, { at, duration, thickness }) => {
  tl.to(u.uProgress, { value: 1, duration, ease: 'power1.out' }, at);
  tl.to(u.uThickness, { value: thickness, duration, ease: 'linear' }, at);
};

/** The lava recedes to nothing and its edge thins back out. */
export const addDissolveRecede = (tl, u, { at, duration }) => {
  tl.to(u.uProgress, { value: 0, duration, ease: 'linear' }, at);
  tl.to(u.uThickness, { value: 0, duration, ease: 'linear' }, at);
};
