import { Howl } from 'howler';
import RunningSoundEffect from '#assets/sounds/running.mp3';

// Singleton running sound effect instance
const runningSoundEffect = new Howl({
  src: [RunningSoundEffect],
  autoplay: false,
  loop: true,
  volume: 0.4,
  rate: 1.1,
});

export default runningSoundEffect;
