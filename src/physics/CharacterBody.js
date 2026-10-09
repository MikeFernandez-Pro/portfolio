import * as THREE from 'three';

import { BODY_TYPE_DYNAMIC, BODY_TYPE_FIXED } from './PhysicsWorld.js';

// Mass rapier derived from the capsule collider (halfHeight 0.3, radius 0.25,
// default density 1, f32-rounded inside the wasm). Keeps applyImpulse(1.2)
// producing the exact same velocity change (6.54809) as before the migration.
const CAPSULE_MASS = 0.18325957655906677;

/**
 * The character's physics body. Exposes the subset of the rapier RigidBody
 * API the controller code uses, so the gameplay logic is byte-identical to
 * the rapier version. Rotations are locked (the visual mesh rotates on its
 * own inside the synced group, like it did inside the RigidBody).
 */
export class CharacterBody {
  constructor({
    position = [0, 0, 0],
    capsuleHalfHeight,
    capsuleRadius,
    capsuleOffsetY,
    bodyType = BODY_TYPE_DYNAMIC,
  }) {
    this._position = new THREE.Vector3(...position);
    this._velocity = new THREE.Vector3();
    this._type = bodyType;
    this._object = null;
    // Starts grounded: the character spawns standing (a FIXED body never
    // updates this, matching how the old ground-sensor state stayed frozen)
    this._grounded = true;
    this._groundedTimer = 0;
    this.capsuleHalfHeight = capsuleHalfHeight;
    this.capsuleRadius = capsuleRadius;
    this.capsuleOffsetY = capsuleOffsetY;
  }

  // The Object3D kept in sync with the body (what the RigidBody wrapper did)
  setObject3D(object) {
    this._object = object;
    this._sync();
  }

  _sync() {
    if (this._object) this._object.position.copy(this._position);
  }

  translation() {
    const p = this._position;
    return { x: p.x, y: p.y, z: p.z };
  }

  setTranslation(translation) {
    const { x, y, z } = translation;
    this._position.set(x, y, z);
    this._sync();
  }

  linvel() {
    const v = this._velocity;
    return { x: v.x, y: v.y, z: v.z };
  }

  setLinvel(velocity) {
    const { x, y, z } = velocity;
    this._velocity.set(x, y, z);
  }

  applyImpulse(impulse) {
    if (this._type !== BODY_TYPE_DYNAMIC) return;
    this._velocity.x += impulse.x / CAPSULE_MASS;
    this._velocity.y += impulse.y / CAPSULE_MASS;
    this._velocity.z += impulse.z / CAPSULE_MASS;
  }

  bodyType() {
    return this._type;
  }

  setBodyType(type) {
    if (type === this._type) return;
    this._type = type;
    // rapier zeroes the velocity when a body becomes non-dynamic
    if (type === BODY_TYPE_FIXED) this._velocity.set(0, 0, 0);
  }

  mass() {
    return CAPSULE_MASS;
  }

  // True while the contact solve sees ground under the capsule (plus a short
  // grace window, see PhysicsWorld). Drives jumping and the grounded store
  // state in the controller.
  isGrounded() {
    return this._grounded;
  }

  // Called on jump: without this, the grounded grace window would re-enable
  // jumping for a few frames after takeoff
  clearGrounded() {
    this._grounded = false;
    this._groundedTimer = 0;
  }
}
