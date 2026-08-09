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

export default runningSoundEffect;
