import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three/webgpu';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei/webgpu';

import LanternModel from '#assets/models/character/lantern.glb';
import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import { IS_MOBILE_DEVICE } from '#utils/device.js';
import { BODY_TYPE_FIXED as FIXED } from '#character/constants.js';
import { useLanternMaterial } from '#character/useLanternMaterial.js';
import {
  BELT_LANTERN_LIGHT_DEFAULTS,
  beltLanternLightUniforms,
  beltLanternLightSettings,
} from '#islands/world/pointLights/islandPointLights.js';

const ATTACH_GROUP_NAME = 'lanternAttachGroup';
const LANTERN_MESH_NAME = 'Cube';

// Offsets measured in Blender against the exported character (character glb
// root space); the attach group below reproduces exactly that frame
const TRANSFORM_DEFAULTS = {
  position: [-0.63, 2.3, -0.16],
  rotation: [0.63, 0, -0.46],
  scale: 1,
};

const SWING_DEFAULTS = {
  stiffness: 200,
  damping: 8,
  maxAngle: 0.6,
  influence: 0.05,
  yawInfluence: 0.25,
  verticalInfluence: 0.02,
  smoothing: 12,
};

// Anything above this is a teleport, not gameplay (run start/stop velocity
// snaps peak around |Δv|/dt ≈ 700 at 165Hz)
const MAX_ACCEL = 2000;

// Scratch vector for the per-frame light offset (no allocations)
const LIGHT_OFFSET = new THREE.Vector3();

const clampAngle = (value, limit) => Math.min(Math.max(value, -limit), limit);
const wrapAngle = value => Math.atan2(Math.sin(value), Math.cos(value));

// Hangs the lantern from the character's belt: a group parented under the
// hips bone whose local matrix (boneInverse * bindMatrix) makes its frame
// coincide with the character glb root frame at bind pose — so the offsets
// measured in Blender apply verbatim and every rig scale oddity cancels.
// A swing group at the lantern's top-loop origin adds damped pendulum motion
// driven by the body's acceleration and turn rate.
const useLanternAttachment = ({ scene, characterBody, characterMesh }) => {
  const { scene: lanternScene } = useGLTF(LanternModel);

  const offsetGroupRef = useRef(null);
  const swingGroupRef = useRef(null);
  const lanternMeshRef = useRef(null);

  // Mutated by the controls, applied on (re)build
  const transform = useRef({
    position: [...TRANSFORM_DEFAULTS.position],
    rotation: [...TRANSFORM_DEFAULTS.rotation],
    scale: TRANSFORM_DEFAULTS.scale,
  }).current;
  const swing = useRef({ ...SWING_DEFAULTS }).current;

  // Pendulum state (scalars only, no per-frame allocations)
  const sim = useRef({
    initialized: false,
    prevVelX: 0,
    prevVelY: 0,
    prevVelZ: 0,
    accX: 0,
    accY: 0,
    accZ: 0,
    prevYaw: 0,
    angX: 0,
    angZ: 0,
    velX: 0,
    velZ: 0,
  }).current;

  const applyTransform = () => {
    const offsetGroup = offsetGroupRef.current;
    const mesh = lanternMeshRef.current;
    if (!offsetGroup || !mesh) return;
    offsetGroup.position.set(...transform.position);
    // Static rotation/scale live on the mesh inside the swing group so the
    // swing axes stay character-aligned instead of tilted by the rest pose
    mesh.rotation.set(...transform.rotation);
    mesh.scale.setScalar(transform.scale);
  };

  useLayoutEffect(() => {
    const knight = scene.getObjectByName('knight');
    // GLTFLoader strips ':' from node names: mixamorig:Hips -> mixamorigHips
    let hips = scene.getObjectByName('mixamorigHips');
    if (!hips) {
      scene.traverse(object => {
        if (!hips && object.isBone && /Hips$/.test(object.name)) hips = object;
      });
    }
    if (!knight?.skeleton || !hips) return;

    const boneIndex = knight.skeleton.bones.indexOf(hips);
    if (boneIndex === -1) return;

    // The mesh may still hang under a previous attach group (HMR remount)
    const mesh =
      lanternScene.getObjectByName(LANTERN_MESH_NAME) ??
      scene.getObjectByName(LANTERN_MESH_NAME);
    if (!mesh) return;
    hips.getObjectByName(ATTACH_GROUP_NAME)?.removeFromParent();

    // At bind pose hipsWorld * boneInverse * bindMatrix = character root, so
    // this local matrix pins the root frame rigidly to the hips
    const bindLocal = new THREE.Matrix4()
      .copy(knight.skeleton.boneInverses[boneIndex])
      .multiply(knight.bindMatrix);

    const attachGroup = new THREE.Group();
    attachGroup.name = ATTACH_GROUP_NAME;
    bindLocal.decompose(
      attachGroup.position,
      attachGroup.quaternion,
      attachGroup.scale
    );

    // The glb node ships with the Blender placement baked in; zero it out and
    // let the transform controls own it instead
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.setScalar(1);
    if (!IS_MOBILE_DEVICE) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }

    const offsetGroup = new THREE.Group();
    const swingGroup = new THREE.Group();
    swingGroup.add(mesh);
    offsetGroup.add(swingGroup);
    attachGroup.add(offsetGroup);
    hips.add(attachGroup);

    offsetGroupRef.current = offsetGroup;
    swingGroupRef.current = swingGroup;
    lanternMeshRef.current = mesh;
    sim.initialized = false;
    applyTransform();

    return () => {
      attachGroup.removeFromParent();
      // Return the mesh to the cached gltf scene for the next mount
      lanternScene.add(mesh);
      offsetGroupRef.current = null;
      swingGroupRef.current = null;
      lanternMeshRef.current = null;
    };
  }, [scene, lanternScene]);

  useLanternMaterial(scene, lanternMeshRef);

  useControls('LanternTransform', {
    position: {
      value: TRANSFORM_DEFAULTS.position,
      step: 0.01,
      onChange: v => {
        transform.position = v;
        applyTransform();
      },
    },
    rotation: {
      value: TRANSFORM_DEFAULTS.rotation,
      step: 0.01,
      onChange: v => {
        transform.rotation = v;
        applyTransform();
      },
    },
    scale: {
      value: TRANSFORM_DEFAULTS.scale,
      min: 0.1,
      max: 3,
      step: 0.01,
      onChange: v => {
        transform.scale = v;
        applyTransform();
      },
    },
  });

  useControls('LanternSwing', {
    stiffness: {
      value: SWING_DEFAULTS.stiffness,
      min: 1,
      max: 200,
      step: 1,
      onChange: v => (swing.stiffness = v),
    },
    damping: {
      value: SWING_DEFAULTS.damping,
      min: 0,
      max: 30,
      step: 0.1,
      onChange: v => (swing.damping = v),
    },
    maxAngle: {
      value: SWING_DEFAULTS.maxAngle,
      min: 0,
      max: 1.5,
      step: 0.01,
      onChange: v => (swing.maxAngle = v),
    },
    influence: {
      value: SWING_DEFAULTS.influence,
      min: -0.2,
      max: 0.2,
      step: 0.005,
      onChange: v => (swing.influence = v),
    },
    yawInfluence: {
      value: SWING_DEFAULTS.yawInfluence,
      min: -1,
      max: 1,
      step: 0.01,
      onChange: v => (swing.yawInfluence = v),
    },
    verticalInfluence: {
      value: SWING_DEFAULTS.verticalInfluence,
      min: -0.2,
      max: 0.2,
      step: 0.005,
      onChange: v => (swing.verticalInfluence = v),
    },
    smoothing: {
      value: SWING_DEFAULTS.smoothing,
      min: 1,
      max: 40,
      step: 0.5,
      onChange: v => (swing.smoothing = v),
    },
  });

  // Fake point light following the lantern (BeltLanternLight debug folder)
  const beltLanternLightControl = uniformControls(beltLanternLightUniforms);
  useControls('BeltLanternLight', {
    color: beltLanternLightControl(
      'uBeltLanternLightColor',
      BELT_LANTERN_LIGHT_DEFAULTS.color
    ),
    intensity: beltLanternLightControl(
      'uBeltLanternLightIntensity',
      BELT_LANTERN_LIGHT_DEFAULTS.intensity,
      0,
      10,
      0.05
    ),
    decay: beltLanternLightControl(
      'uBeltLanternLightDecay',
      BELT_LANTERN_LIGHT_DEFAULTS.decay,
      0,
      1,
      0.005
    ),
    decayPower: beltLanternLightControl(
      'uBeltLanternLightDecayPower',
      BELT_LANTERN_LIGHT_DEFAULTS.decayPower,
      0.1,
      8,
      0.05
    ),
    specularPower: beltLanternLightControl(
      'uBeltLanternLightSpecularPower',
      BELT_LANTERN_LIGHT_DEFAULTS.specularPower,
      1,
      64,
      1
    ),
    offset: {
      value: BELT_LANTERN_LIGHT_DEFAULTS.offset,
      min: -1,
      max: 1,
      step: 0.01,
      onChange: v => {
        beltLanternLightSettings.offset = v;
      },
    },
  });

  useFrame((_, delta) => {
    const swingGroup = swingGroupRef.current;
    const body = characterBody.current;
    const mesh = characterMesh.current;
    if (!swingGroup || !body || !mesh) return;

    // Pin the fake light onto the lantern (world space). The offset control
    // is expressed in character space: rotated by the mesh yaw so "in front
    // of the belt" stays in front whichever way the character faces
    const lightPosition = beltLanternLightUniforms.uBeltLanternLightPosition;
    lanternMeshRef.current.getWorldPosition(lightPosition.value);
    LIGHT_OFFSET.set(...beltLanternLightSettings.offset).applyQuaternion(
      mesh.quaternion
    );
    lightPosition.value.add(LIGHT_OFFSET);

    const dt = Math.min(delta, 1 / 30);
    if (dt <= 0) return;

    const velocity = body.linvel();
    // The mesh only ever yaws; euler.y folds past 90° so read the quaternion
    const q = mesh.quaternion;
    const yaw = 2 * Math.atan2(q.y, q.w);
    const paused = body.bodyType() === FIXED;

    if (paused || !sim.initialized) {
      // Respawn teleports and pauses must not read as huge accelerations
      sim.prevVelX = velocity.x;
      sim.prevVelY = velocity.y;
      sim.prevVelZ = velocity.z;
      sim.accX = sim.accY = sim.accZ = 0;
      sim.prevYaw = yaw;
      sim.initialized = true;
    }

    let ax = (velocity.x - sim.prevVelX) / dt;
    let ay = (velocity.y - sim.prevVelY) / dt;
    let az = (velocity.z - sim.prevVelZ) / dt;
    sim.prevVelX = velocity.x;
    sim.prevVelY = velocity.y;
    sim.prevVelZ = velocity.z;
    if (ax * ax + ay * ay + az * az > MAX_ACCEL * MAX_ACCEL) {
      ax = ay = az = 0;
    }

    // One-frame velocity snaps smooth into a frame-rate independent pulse
    // (peak ≈ Δv * smoothing)
    const blend = 1 - Math.exp(-swing.smoothing * dt);
    sim.accX += (ax - sim.accX) * blend;
    sim.accY += (ay - sim.accY) * blend;
    sim.accZ += (az - sim.accZ) * blend;

    const yawRate = wrapAngle(yaw - sim.prevYaw) / dt;
    sim.prevYaw = yaw;

    // World acceleration into the character's local frame
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const localAX = cos * sim.accX - sin * sim.accZ;
    const localAZ = sin * sim.accX + cos * sim.accZ;

    // The lantern bottom lags opposite the acceleration; turning flings it
    // sideways, vertical acceleration (jump/land) bobs it fore/aft
    let targetX = 0;
    let targetZ = 0;
    if (!paused) {
      targetX = clampAngle(
        swing.influence * localAZ - swing.verticalInfluence * sim.accY,
        swing.maxAngle
      );
      targetZ = clampAngle(
        -swing.influence * localAX + swing.yawInfluence * yawRate,
        swing.maxAngle
      );
    }

    // Semi-implicit Euler damped spring
    sim.velX +=
      (swing.stiffness * (targetX - sim.angX) - swing.damping * sim.velX) * dt;
    sim.velZ +=
      (swing.stiffness * (targetZ - sim.angZ) - swing.damping * sim.velZ) * dt;
    sim.angX = clampAngle(sim.angX + sim.velX * dt, swing.maxAngle);
    sim.angZ = clampAngle(sim.angZ + sim.velZ * dt, swing.maxAngle);

    swingGroup.rotation.set(sim.angX, 0, sim.angZ);
  });
};

useGLTF.preload(LanternModel);

export { useLanternAttachment };
