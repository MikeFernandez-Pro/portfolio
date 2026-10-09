// Baseline volume for every sound effect, shared by reference so the
// 'Sounds' debug folder (Experience.jsx) can tweak them at runtime.
// Sounds read from this object at play/fade time; the distance-attenuated
// ones (portal, hammer) use their entry as an overall loudness multiplier.
const SOUND_VOLUMES = {
  ambient: 0.09,
  running: 0.4,
  skillsGlyph: 0.15,
  pressurePlate: 0.09,
  portal: 0.7,
  hammer: 0.5,
};

export { SOUND_VOLUMES };
