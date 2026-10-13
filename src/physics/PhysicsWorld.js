import * as THREE from 'three';

// Body type values mirror rapier's RigidBodyType enum (Dynamic = 0,
// Fixed = 1), like the rest of the CharacterBody API
export const BODY_TYPE_DYNAMIC = 0;
export const BODY_TYPE_FIXED = 1;

// Rapier-parity constants, measured against @dimforge/rapier3d-compat 0.19.2
// with the exact in-game body setup (see scripts/physics-parity.mjs):
// - rapier's TGS solver advances each step in 4 substeps; free fall gains
//   g*dt^2*(N+1)/2N of position per frame and friction saturates per substep
// - capsule friction 0 combined (Average rule) with the trimesh default 0.5
//   gives an effective ground friction of 0.25: setLinvel(4) runs at 3.9234
const SUBSTEPS = 4;
const GROUND_FRICTION = 0.25;
// Delta clamp. rapier's timeStep="vary" clamped at 0.5s, but a 0.125s substep
// moves a running capsule ~0.5 units — through a fence. 0.1s keeps substep
// travel under the capsule radius; it only engages on frames slower than
// 10fps (a hitch, or mobile returning from background — mobile has no
// blur-pause), where time slowing briefly beats teleporting
const MAX_DT = 0.1;
// Contacts are detected within this gap of the capsule surface and solved on
// the VELOCITY before integrating the position (rapier's speculative-contact
// prediction distance). Solving velocity first is load-bearing: penetrate-
// then-push-out ratchets the capsule along wall seams that rapier's friction
// holds completely still.
const CONTACT_MARGIN = 0.002;
// Grounded when a solved contact pushes steeper than this (~45°) — the
// contact solve is the source of truth for jumping, replacing the old ground
// trimesh sensor + zero-velocity fallback (contacts can't miss events the
// way thin-trimesh sensor intersections did)
const GROUND_NORMAL_Y = 0.7;
// Short grace so micro-hops over terrain bumps and running off an edge keep
// the grounded state briefly — the old surface-hugging sensor zone gave a
// comparable tolerance (capsule stayed overlapping ~60ms past the edge)
const GROUNDED_GRACE = 0.1;
// Resting early-out. Walk/sprint is 4–6 m/s; anything below this is leftover
// from slope contacts after the controller zeroes xz. 1e-10 (the previous
// threshold) is ~0.01 mm/s — bumpy ground never settled, so standing still
// still paid 8 shapecasts/frame against the 71k-tri island collider.
const REST_SPEED_SQ = 0.02 * 0.02;

// Scratch objects (single character, stepped once per frame)
const segment = new THREE.Line3();
const aabb = new THREE.Box3();
const triPoint = new THREE.Vector3();
const capsulePoint = new THREE.Vector3();
const pushTotal = new THREE.Vector3();
const pushDir = new THREE.Vector3();
const normal = new THREE.Vector3();
const tangent = new THREE.Vector3();
// Contact normals collected during a substep (pooled)
const contacts = [];
const contactPool = [];
const contactGaps = [];
let contactCount = 0;
// Whether any ground-facing contact got solved during the current step
let groundContact = false;

// Shapecast option objects are reused every query. The callbacks close over
// these module slots (and the scratches above), so the hot path doesn't
// allocate a new descriptor + two closures 8+ times per moving frame.
let activeWorld = null;
let activeBody = null;
let activeReach = 0;
let activeRadius = 0;

const intersectsCapsuleAabb = box => box.intersectsBox(aabb);

const collectVelocityContact = tri => {
  const distance = tri.closestPointToSegment(segment, triPoint, capsulePoint);
  if (distance >= activeReach) return;
  if (distance > 1e-7) {
    pushDir.subVectors(capsulePoint, triPoint).divideScalar(distance);
  } else {
    // Capsule axis exactly on the triangle: fall back to its normal
    tri.getNormal(pushDir);
  }
  // Dedupe near-parallel normals: the mesh fans many almost
  // coplanar triangles into one physical contact, and solving each
  // copy bleeds velocity (rapier reduces the manifold the same way)
  for (let i = 0; i < contactCount; i++) {
    if (contacts[i].dot(pushDir) > 0.985) return;
  }
  if (!contactPool[contactCount]) {
    contactPool[contactCount] = new THREE.Vector3();
  }
  contacts[contactCount] = contactPool[contactCount].copy(pushDir);
  contactGaps[contactCount] = distance - activeBody.capsuleRadius;
  contactCount++;
  if (activeWorld.debugCapture && activeWorld.debugContacts.length < 32) {
    activeWorld.debugContacts.push({
      point: triPoint.clone(),
      normal: pushDir.clone(),
    });
  }
};

const pushOutTriangle = tri => {
  const distance = tri.closestPointToSegment(segment, triPoint, capsulePoint);
  if (distance >= activeRadius) return;
  const depth = activeRadius - distance;
  if (distance > 1e-7) {
    pushDir.subVectors(capsulePoint, triPoint).divideScalar(distance);
  } else {
    tri.getNormal(pushDir);
  }
  segment.start.addScaledVector(pushDir, depth);
  segment.end.addScaledVector(pushDir, depth);
  pushTotal.addScaledVector(pushDir, depth);
};

const sensorHitsTriangle = tri =>
  tri.closestPointToSegment(segment, triPoint, capsulePoint) < activeRadius;

const VELOCITY_CAST = {
  intersectsBounds: intersectsCapsuleAabb,
  intersectsTriangle: collectVelocityContact,
};
const DEPENETRATE_CAST = {
  intersectsBounds: intersectsCapsuleAabb,
  intersectsTriangle: pushOutTriangle,
};
const SENSOR_CAST = {
  intersectsBounds: intersectsCapsuleAabb,
  intersectsTriangle: sensorHitsTriangle,
};

const boundsOf = bvh =>
  bvh.geometry.boundingBox ?? bvh.getBoundingBox(new THREE.Box3());

// Same payload shape the rapier event handlers consumed
const sensorEvent = (body, sensor) => ({
  other: { rigidBody: body },
  target: { rigidBody: { userData: sensor.userData } },
});

/**
 * Minimal physics world replacing rapier: one dynamic capsule (the character)
 * against static world-space BVH trimeshes, plus BVH sensor zones with
 * enter/exit events. Solids and sensors are baked to world space up front so
 * the per-frame tests are matrix-free. The solver reads and writes the
 * body's internal state (_position, _velocity, the grounded timer) directly:
 * CharacterBody only exists for this world.
 */
export class PhysicsWorld {
  constructor({ gravityY }) {
    this.gravityY = gravityY;
    this.solids = new Set();
    this.sensors = new Set();
    this.characterBody = null;
    // Contact capture for the debug visualization (PhysicsDebug). Off in
    // production; the solver never allocates unless this is set.
    this.debugCapture = false;
    this.debugContacts = [];
  }

  addSolid(bvh) {
    const solid = { bvh, bounds: boundsOf(bvh) };
    this.solids.add(solid);
    return { remove: () => this.solids.delete(solid) };
  }

  addSensor({ bvh, userData, onEnter, onExit }) {
    const sensor = {
      bvh,
      bounds: boundsOf(bvh),
      userData,
      onEnter,
      onExit,
      overlapping: false,
    };
    this.sensors.add(sensor);
    return {
      remove: () => this.sensors.delete(sensor),
    };
  }

  setCharacterBody(body) {
    this.characterBody = body;
  }

  step(delta) {
    const body = this.characterBody;
    if (!body) return;

    const dt = Math.min(Math.max(delta, 0), MAX_DT);
    if (body.bodyType() === BODY_TYPE_DYNAMIC && !this._isResting(body)) {
      activeWorld = this;
      activeBody = body;
      const h = dt / SUBSTEPS;
      groundContact = false;
      if (this.debugCapture) this.debugContacts.length = 0;
      for (let i = 0; i < SUBSTEPS; i++) {
        // rapier's TGS substep order: gravity -> solve contact velocities at
        // the current pose -> integrate -> correct any residual penetration
        body._velocity.y += this.gravityY * h;
        this._solveContactVelocities(body, h);
        body._position.addScaledVector(body._velocity, h);
        this._depenetrate(body);
      }
      // Grounded state, with a grace window (frozen like everything else
      // while the body is FIXED)
      body._groundedTimer = groundContact
        ? GROUNDED_GRACE
        : Math.max(0, body._groundedTimer - dt);
      body._grounded = body._groundedTimer > 0;

      // Sensors only react to a non-fixed character (rapier generates no
      // intersection events for fixed-fixed pairs, so a paused/respawning
      // character kept its sensor states frozen — preserve that)
      this._updateSensors(body);
    }
    body._sync();
  }

  // Idle early-out: at rest on the ground the step is provably a no-op (the
  // resting contact cancels gravity every substep, nothing moves, so sensor
  // overlaps can't change either) — skip the solver until velocity
  // reappears (movement input, jump impulse, respawn teleport). Checked on
  // _groundedTimer rather than _grounded so the initial pre-settle frames
  // (spawned slightly airborne with zero velocity, timer still 0) simulate.
  _isResting(body) {
    return body._groundedTimer > 0 && body._velocity.lengthSq() < REST_SPEED_SQ;
  }

  _updateCapsuleBounds(body) {
    const p = body._position;
    const top = p.y + body.capsuleOffsetY + body.capsuleHalfHeight;
    segment.start.set(p.x, top, p.z);
    segment.end.set(p.x, top - 2 * body.capsuleHalfHeight, p.z);
    aabb.makeEmpty();
    aabb.expandByPoint(segment.start);
    aabb.expandByPoint(segment.end);
    aabb.expandByScalar(body.capsuleRadius);
  }

  // Collect contact normals within CONTACT_MARGIN of the capsule surface and
  // solve them against the velocity, one contact at a time like rapier's
  // Gauss-Seidel solver: restitution 0 (cancel the velocity into each
  // surface), then Coulomb friction on the tangential velocity budgeted by
  // that contact's normal impulse. The position is not touched.
  _solveContactVelocities(body, h) {
    this._updateCapsuleBounds(body);
    aabb.expandByScalar(CONTACT_MARGIN);
    activeReach = body.capsuleRadius + CONTACT_MARGIN;
    contactCount = 0;

    for (const solid of this.solids) {
      if (!aabb.intersectsBox(solid.bounds)) continue;
      solid.bvh.shapecast(VELOCITY_CAST);
    }

    for (let i = 0; i < contactCount; i++) {
      normal.copy(contacts[i]);
      // Speculative contact: only remove the approach speed that would
      // actually penetrate within this substep — a positive gap absorbs
      // gap/h of it (rapier's soft TGS constraint does the same)
      const allowed = Math.max(contactGaps[i], 0) / h;
      const vn = body._velocity.dot(normal) + allowed;
      if (vn >= 0) continue;
      if (normal.y > GROUND_NORMAL_Y) groundContact = true;
      body._velocity.addScaledVector(normal, -vn);
      tangent
        .copy(body._velocity)
        .addScaledVector(normal, -body._velocity.dot(normal));
      const vt = tangent.length();
      if (vt > 1e-9) {
        const friction = Math.min(GROUND_FRICTION * -vn, vt);
        body._velocity.addScaledVector(tangent.divideScalar(vt), -friction);
      }
    }
  }

  // Position-only correction of whatever penetration the integration left
  // (fresh contacts the velocity solve couldn't see yet — landings). The
  // velocity is left alone; the next substep's velocity solve handles it.
  _depenetrate(body) {
    this._updateCapsuleBounds(body);
    activeRadius = body.capsuleRadius;
    pushTotal.set(0, 0, 0);

    for (const solid of this.solids) {
      if (!aabb.intersectsBox(solid.bounds)) continue;
      solid.bvh.shapecast(DEPENETRATE_CAST);
    }

    if (pushTotal.lengthSq() > 0) body._position.add(pushTotal);
  }

  _updateSensors(body) {
    this._updateCapsuleBounds(body);
    activeRadius = body.capsuleRadius;

    for (const sensor of this.sensors) {
      if (!aabb.intersectsBox(sensor.bounds)) {
        if (sensor.overlapping) {
          sensor.overlapping = false;
          sensor.onExit?.(sensorEvent(body, sensor));
        }
        continue;
      }
      const overlapping = sensor.bvh.shapecast(SENSOR_CAST);
      if (overlapping === sensor.overlapping) continue;
      sensor.overlapping = overlapping;
      const event = sensorEvent(body, sensor);
      if (overlapping) sensor.onEnter?.(event);
      else sensor.onExit?.(event);
    }
  }
}
