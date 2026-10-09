// What the death cycle animates, registered by the components that own it
// once they are mounted: the character dissolve uniforms, the spawn spiral
// ({ uniforms, mesh }) and the death particles ({ mesh, uniforms }). Each
// register returns its unregister. Timelines skip a target that isn't
// registered yet.
const targets = { dissolve: null, spiral: null, particles: null };

const register = (key, value) => {
  targets[key] = value;
  return () => {
    if (targets[key] === value) targets[key] = null;
  };
};

const registerDissolve = uniforms => register('dissolve', uniforms);
const registerSpiral = spiral => register('spiral', spiral);
const registerDeathParticles = particles => register('particles', particles);

export { targets, registerDissolve, registerSpiral, registerDeathParticles };
