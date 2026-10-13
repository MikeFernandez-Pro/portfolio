import { Howl } from 'howler';
import RunningSoundEffect from '#assets/sounds/running.mp3';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';

// Singleton running sound effect instance
const runningSoundEffect = new Howl({
  src: [RunningSoundEffect],
  autoplay: false,
  loop: true,
  volume: SOUND_VOLUMES.running,
  rate: 1.1,
});

// Whether the loop was started (also while its play is still queued before
// the file loads). The controller stops it on every idle frame: Howler's
// stop() walks its sounds, and queues one more stop per call before load. A
// second play() while playing would overlap a new instance
let running = false;

export const playRunningSound = () => {
  if (running) return;
  running = true;
  runningSoundEffect.play();
};

export const stopRunningSound = () => {
  if (!running) return;
  running = false;
  runningSoundEffect.stop();
};

export default runningSoundEffect;
