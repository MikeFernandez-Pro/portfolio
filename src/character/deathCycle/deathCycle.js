import gsap from 'gsap';

import { useStore } from '#store';
import { playDeathAnimation, resetDeathAnimation } from './deathAnimation.js';
import { playRespawnAnimation } from './respawnAnimation.js';
import { playDeathParticles } from './DeathParticles.jsx';

export {
  registerDissolve,
  registerSpiral,
  registerDeathParticles,
} from './targets.js';

// Where the character rests at the spawn point. The body is held FIXED
// during the respawn, so this is the settled height, not the initial
// pre-settle 0.7 the body is created at
export const SPAWN_POINT = { x: 0, y: 0.62, z: 0 };

// Seconds from the death: the character teleports to the spawn point while
// fully dissolved, then the respawn dissolve forms it back
const TELEPORT_AT = 0.9;
const RESPAWN_AT = TELEPORT_AT + 0.6;

let sequence = null;

/**
 * The death cycle: the character dissolves away and the death particles
 * rise from `position`, then `onTeleport` (move the body to SPAWN_POINT),
 * then the respawn forms it back with the spiral sweeping under it, and
 * `onRespawned` once the character is formed (the spiral may still run).
 */
export const die = (position, { onTeleport, onRespawned }) => {
  playDeathAnimation();
  playDeathParticles(position);

  sequence?.kill();
  sequence = gsap.timeline();
  sequence.call(onTeleport, undefined, TELEPORT_AT);
  sequence.call(
    () => playRespawnAnimation({ onComplete: onRespawned }),
    undefined,
    RESPAWN_AT
  );
};

// Debug preview of a death at the character's current position (the spawn
// point before it moved): it dissolves away while the death particles rise,
// then forms back in place once both are done (no teleport, no respawn)
export const playDeathPreview = () => {
  const position = useStore.getState().characterPosition ?? SPAWN_POINT;
  const death = playDeathAnimation();
  const particles = playDeathParticles(position);
  // gsap tweens/timelines are thenable
  Promise.all([death, particles].filter(Boolean)).then(() =>
    resetDeathAnimation()
  );
};
