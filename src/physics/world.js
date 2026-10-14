import { PhysicsWorld } from './PhysicsWorld.js';

// ~3x earth — tuned for the jump feel. Also read by
// scripts/physics-parity.mjs
export const GRAVITY_Y = -29.43;

// The single game world
export const physicsWorld = new PhysicsWorld({ gravityY: GRAVITY_Y });
