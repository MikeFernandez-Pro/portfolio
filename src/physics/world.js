import { PhysicsWorld } from './PhysicsWorld.js';

// The single game world. Same gravity the rapier <Physics> wrapper used
// (~3x earth — tuned for the jump feel).
export const physicsWorld = new PhysicsWorld({ gravityY: -29.43 });
