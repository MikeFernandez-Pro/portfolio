// Parity harness for the rapier -> three-mesh-bvh migration.
//
// Runs the real island collider + sensor zones through BOTH engines with
// identical scripted inputs (settle, run in 4 directions, sprint, run+jump)
// and reports frame-by-frame position deviation and sensor enter frames.
//
// @dimforge/rapier3d-compat is kept as a devDependency (node_modules only,
// never bundled) so this stays runnable. Run it after ANY change to
// src/physics solver order or constants. islandSensors.glb is also only
// referenced from here since grounded moved into the contact solve.
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import * as THREE from 'three';

import {
  PhysicsWorld,
  BODY_TYPE_DYNAMIC,
} from '../src/physics/PhysicsWorld.js';
import { CharacterBody } from '../src/physics/CharacterBody.js';
import { GRAVITY_Y } from '../src/physics/world.js';
import {
  bakeToWorldSpace,
  buildWorldSpaceBvh,
} from '../src/physics/buildBvh.js';
import {
  ISLAND_COLLIDER_TRANSFORM,
  ISLAND_POSITION,
  ISLAND_SCALE,
} from '../src/islands/islandSpace.js';

const { default: RAPIER } = await import('@dimforge/rapier3d-compat');
await RAPIER.init();

const DT = 1 / 60;

// --- load geometries (gltf-transform: GLTFLoader's draco path needs web
// workers, which node lacks) --------------------------------------------
const io = new NodeIO()
  .registerExtensions(KHRONOS_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
  });

async function loadGlb(path) {
  return io.read(fileURLToPath(new URL(path, import.meta.url)));
}

// Raw primitive data -> BufferGeometry, ignoring the GLB node transform (the
// components take nodes.<name>.geometry and apply their own transform)
function findGeometry(document, name) {
  for (const mesh of document.getRoot().listMeshes()) {
    const nodeName =
      mesh.getName() ||
      mesh
        .listParents()
        .find(p => p.propertyType === 'Node')
        ?.getName();
    if (nodeName !== name) continue;
    const primitive = mesh.listPrimitives()[0];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        primitive.getAttribute('POSITION').getArray(),
        3
      )
    );
    const indices = primitive.getIndices();
    if (indices) {
      geometry.setIndex(new THREE.BufferAttribute(indices.getArray(), 1));
    }
    return geometry;
  }
  // fall back to node names
  for (const node of document.getRoot().listNodes()) {
    if (node.getName() === name && node.getMesh()) {
      const primitive = node.getMesh().listPrimitives()[0];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(
          primitive.getAttribute('POSITION').getArray(),
          3
        )
      );
      const indices = primitive.getIndices();
      if (indices) {
        geometry.setIndex(new THREE.BufferAttribute(indices.getArray(), 1));
      }
      return geometry;
    }
  }
  throw new Error(`mesh/node ${name} not found`);
}

const colliders = await loadGlb(
  '../src/assets/models/islandColliders/island-colliders.glb'
);
const sensors = await loadGlb(
  '../src/assets/models/islandSensors/islandSensors.glb'
);
const zones = await loadGlb(
  '../src/assets/models/islandSensors/fallingZone.glb'
);

const islandGeometry = findGeometry(colliders, 'Collider');
const groundSensorGeometry = findGeometry(sensors, 'Sensor');
const fallingZoneGeometry = findGeometry(zones, 'fallingZone');
const deathZoneGeometry = findGeometry(zones, 'deathZone');

// Transforms as used by the components (the ground sensor is only baked
// here: grounded comes from the contact solve in the game)
const [ISLAND_X, ISLAND_Y, ISLAND_Z] = ISLAND_POSITION;
const ISLAND = ISLAND_COLLIDER_TRANSFORM;
const GROUND_SENSOR = {
  position: [ISLAND_X, 2.4, ISLAND_Z],
  scale: ISLAND_SCALE,
};
const FALLING_ZONE = { position: ISLAND_POSITION, scale: ISLAND_SCALE };
const DEATH_ZONE = {
  position: [ISLAND_X, ISLAND_Y - 1, ISLAND_Z],
  scale: ISLAND_SCALE,
};

function toTrimeshData(geometry) {
  const vertices = new Float32Array(geometry.getAttribute('position').array);
  const index = geometry.index
    ? new Uint32Array(geometry.index.array)
    : new Uint32Array([...Array(vertices.length / 3).keys()]);
  return { vertices, index };
}

// --- engine wrappers ------------------------------------------------------
// Both expose: setLinvel, linvel, applyImpulse, translation, step,
// sensorEnters (Map name -> first frame), frame counter managed by scenario
function makeRapierSim(offsetX = 0, start = [0, 0.7, 0]) {
  const world = new RAPIER.World({ x: 0, y: GRAVITY_Y, z: 0 });
  world.timestep = DT;

  const fixed = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const island = toTrimeshData(bakeToWorldSpace(islandGeometry, ISLAND));
  world.createCollider(
    RAPIER.ColliderDesc.trimesh(island.vertices, island.index),
    fixed
  );

  const sensorHandles = new Map();
  for (const [name, geometry, transform] of [
    ['ground', groundSensorGeometry, GROUND_SENSOR],
    ['fallingZone', fallingZoneGeometry, FALLING_ZONE],
    ['deathZone', deathZoneGeometry, DEATH_ZONE],
  ]) {
    const data = toTrimeshData(bakeToWorldSpace(geometry, transform));
    const collider = world.createCollider(
      RAPIER.ColliderDesc.trimesh(data.vertices, data.index)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      fixed
    );
    sensorHandles.set(collider.handle, name);
  }

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(start[0] + offsetX, start[1], start[2])
      .lockRotations()
  );
  world.createCollider(
    RAPIER.ColliderDesc.capsule(0.3, 0.25)
      .setTranslation(0, 0.58, 0)
      .setRestitution(-10)
      .setFriction(0)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    body
  );

  const queue = new RAPIER.EventQueue(true);
  const sim = {
    sensorEnters: new Map(),
    frame: 0,
    setLinvel: v => body.setLinvel(v, true),
    linvel: () => body.linvel(),
    applyImpulse: i => body.applyImpulse(i, true),
    translation: () => body.translation(),
    step: () => {
      world.step(queue);
      queue.drainCollisionEvents((h1, h2, started) => {
        if (!started) return;
        const name = sensorHandles.get(h1) ?? sensorHandles.get(h2);
        if (name && !sim.sensorEnters.has(name)) {
          sim.sensorEnters.set(name, sim.frame);
        }
      });
      sim.frame++;
    },
  };
  return sim;
}

function makeBvhSim(start = [0, 0.7, 0]) {
  const world = new PhysicsWorld({ gravityY: GRAVITY_Y });
  world.addSolid(buildWorldSpaceBvh(islandGeometry, ISLAND));

  const body = new CharacterBody({
    position: start,
    capsuleHalfHeight: 0.3,
    capsuleRadius: 0.25,
    capsuleOffsetY: 0.58,
    bodyType: BODY_TYPE_DYNAMIC,
  });
  world.setCharacterBody(body);

  const sim = {
    sensorEnters: new Map(),
    frame: 0,
    setLinvel: v => body.setLinvel(v),
    linvel: () => body.linvel(),
    applyImpulse: i => body.applyImpulse(i),
    translation: () => body.translation(),
    step: () => {
      world.step(DT);
      sim.frame++;
    },
  };

  for (const [name, geometry, transform] of [
    ['ground', groundSensorGeometry, GROUND_SENSOR],
    ['fallingZone', fallingZoneGeometry, FALLING_ZONE],
    ['deathZone', deathZoneGeometry, DEATH_ZONE],
  ]) {
    world.addSensor({
      bvh: buildWorldSpaceBvh(geometry, transform),
      onEnter: () => {
        if (!sim.sensorEnters.has(name)) sim.sensorEnters.set(name, sim.frame);
      },
    });
  }
  return sim;
}

// --- scenarios ------------------------------------------------------------
// Each scenario drives a sim with per-frame actions exactly like the game
// does (setLinvel before the step, like the controller useFrame runs before
// the physics step).
function runScenario(sim, actions) {
  const trace = [];
  for (const action of actions) {
    for (let i = 0; i < action.frames; i++) {
      if (action.run) {
        const vy = sim.linvel().y;
        sim.setLinvel({
          x: action.run[0],
          y: vy,
          z: action.run[1],
        });
      }
      if (action.idle) {
        const vy = sim.linvel().y;
        sim.setLinvel({ x: 0, y: vy, z: 0 });
      }
      if (i === 0 && action.jump) sim.applyImpulse({ x: 0, y: 1.2, z: 0 });
      sim.step();
      const p = sim.translation();
      trace.push([p.x, p.y, p.z, sim.linvel().y]);
    }
  }
  return trace;
}

const TRACE = process.argv.includes('--trace');
function printWindow(name, a, b, from, to) {
  console.log(`--- ${name} frames ${from}..${to} (rapier | bvh) ---`);
  for (let i = from; i <= to; i++) {
    console.log(
      `f${i}  x ${a[i][0].toFixed(3)} | ${b[i][0].toFixed(3)}   y ${a[i][1].toFixed(4)} | ${b[i][1].toFixed(4)}   vy ${a[i][3].toFixed(3)} | ${b[i][3].toFixed(3)}   z ${a[i][2].toFixed(3)} | ${b[i][2].toFixed(3)}`
    );
  }
}

const SETTLE = { frames: 90, idle: true };
const scenarios = {
  settle: [{ frames: 240, idle: true }],
  'run +x': [SETTLE, { frames: 240, run: [4, 0] }],
  'run -x': [SETTLE, { frames: 240, run: [-4, 0] }],
  'run +z': [SETTLE, { frames: 240, run: [0, 4] }],
  'run -z': [SETTLE, { frames: 300, run: [0, -4] }],
  'sprint -z': [SETTLE, { frames: 300, run: [0, -6] }],
  'run+jump -z': [
    SETTLE,
    { frames: 40, run: [0, -4] },
    { frames: 60, run: [0, -4], jump: true },
    { frames: 60, run: [0, -4] },
  ],
  'jump in place': [SETTLE, { frames: 90, idle: true, jump: true }],
  // run down the path then veer off sideways until falling off the world:
  // checks the fallingZone/deathZone enter frames (falling animation + death
  // timing) match
  'fall off edge': [
    SETTLE,
    { frames: 150, run: [0, -4] },
    { frames: 300, run: [4, 0] },
  ],
  'fall off edge -x': [
    SETTLE,
    { frames: 150, run: [0, -4] },
    { frames: 300, run: [-4, 0] },
  ],
};

// Drop tests through the falling/death zones: spawn above fallingZone
// vertices (the zones hang under the island edges, over the void) and free
// fall through both — verifies the falling-animation and death event frames.
{
  const zoneGeometry = bakeToWorldSpace(fallingZoneGeometry, FALLING_ZONE);
  const positions = zoneGeometry.getAttribute('position');
  for (const fraction of [0.1, 0.5, 0.9]) {
    const i = Math.floor(positions.count * fraction);
    const start = [positions.getX(i), positions.getY(i) + 2, positions.getZ(i)];
    scenarios[`drop through zones @${fraction}`] = [
      { frames: 150, idle: true, start },
    ];
  }
}

// Chaos control: rapier vs rapier with a 1mm initial offset. Establishes the
// divergence floor terrain-bump sensitivity causes within the SAME engine —
// bvh deviations at or below this level are noise, not behavior differences.
const CHAOS_CONTROL = process.argv.includes('--chaos');

for (const [name, actions] of Object.entries(scenarios)) {
  const start = actions[0].start ?? [0, 0.7, 0];
  const rapierSim = makeRapierSim(0, start);
  const bvhSim = CHAOS_CONTROL
    ? makeRapierSim(0.001, start)
    : makeBvhSim(start);
  const a = runScenario(rapierSim, actions);
  const b = runScenario(bvhSim, actions);

  let maxDev = 0;
  let maxFrame = 0;
  let sumDev = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.hypot(
      a[i][0] - b[i][0],
      a[i][1] - b[i][1],
      a[i][2] - b[i][2]
    );
    sumDev += d;
    if (d > maxDev) {
      maxDev = d;
      maxFrame = i;
    }
  }
  const last = a.length - 1;
  console.log(`\n=== ${name} ===`);
  console.log(
    `max deviation ${maxDev.toFixed(4)} @ frame ${maxFrame}, mean ${(sumDev / a.length).toFixed(4)}`
  );
  console.log(
    `final rapier (${a[last].map(v => v.toFixed(3)).join(', ')})  bvh (${b[last]
      .map(v => v.toFixed(3))
      .join(', ')})`
  );
  const apexA = Math.max(...a.map(p => p[1]));
  const apexB = Math.max(...b.map(p => p[1]));
  console.log(`apex y rapier ${apexA.toFixed(4)}  bvh ${apexB.toFixed(4)}`);
  if (TRACE && name === 'run+jump -z') printWindow(name, a, b, 124, 160);
  if (TRACE && name === 'settle') printWindow(name, a, b, 0, 10);
  if (TRACE && name === 'drop through zones @0.1')
    printWindow(name, a, b, 18, 60);
  // locate where a large divergence begins
  if (TRACE && maxDev > 0.5) {
    let start = 0;
    for (let i = 0; i < a.length; i++) {
      const d = Math.hypot(
        a[i][0] - b[i][0],
        a[i][1] - b[i][1],
        a[i][2] - b[i][2]
      );
      if (d > 0.3) {
        start = i;
        break;
      }
    }
    printWindow(
      name,
      a,
      b,
      Math.max(0, start - 20),
      Math.min(a.length - 1, start + 15)
    );
  }
  const minA = Math.min(...a.map(p => p[1]));
  const minB = Math.min(...b.map(p => p[1]));
  console.log(`min y rapier ${minA.toFixed(3)}  bvh ${minB.toFixed(3)}`);
  console.log(
    'sensor enters rapier:',
    [...rapierSim.sensorEnters.entries()]
      .map(([n, f]) => `${n}@${f}`)
      .join(' ') || '(none)',
    '| bvh:',
    [...bvhSim.sensorEnters.entries()].map(([n, f]) => `${n}@${f}`).join(' ') ||
      '(none)'
  );
}
