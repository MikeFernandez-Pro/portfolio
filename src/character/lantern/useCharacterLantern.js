import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three/webgpu';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei/webgpu';

import LanternModel from '#assets/models/character/lantern.glb';
import { useControls } from '#debug/useControls.jsx';
import { IS_MOBILE_DEVICE } from '#utils/device.js';
import { BODY_TYPE_FIXED as FIXED } from '#physics/PhysicsWorld.js';
import { attachToBoneInRootFrame } from '#character/boneAttachment.js';
import { useLanternMaterial } from './useLanternMaterial.js';
import { createLanternSwing } from './lanternSwing.js';
import { pointLights } from '#islands/world/pointLights/pointLights.js';
import { pointLightControls } from '#islands/world/pointLights/pointLightControls.js';

const ATTACH_GROUP_NAME = 'lanternAttachGroup';
// The character lantern mesh, as named in Blender
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

// Scratch vector for the per-frame light offset (no allocations)
const LIGHT_OFFSET = new THREE.Vector3();

// Hangs the character lantern from the belt: a group welded to the hips in
// the character root frame (attachToBoneInRootFrame), so the offsets
// measured in Blender apply verbatim. A swing group at the lantern's
// top-loop origin adds damped pendulum motion (createLanternSwing).
const useCharacterLantern = ({
  scene,
  characterBody,
  characterMesh,
  dissolve,
}) => {
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
  const pendulumRef = useRef(null);
  if (!pendulumRef.current) pendulumRef.current = createLanternSwing(swing);
  const pendulum = pendulumRef.current;

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
    // Look the mesh up first: it may still hang under a previous attach
    // group (HMR remount), which attaching removes
    const mesh =
      lanternScene.getObjectByName(LANTERN_MESH_NAME) ??
      scene.getObjectByName(LANTERN_MESH_NAME);
    if (!mesh) return;

    const attachment = attachToBoneInRootFrame(
      scene,
      'Hips',
      ATTACH_GROUP_NAME
    );
    if (!attachment) return;
    const attachGroup = attachment.group;

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

    offsetGroupRef.current = offsetGroup;
    swingGroupRef.current = swingGroup;
    lanternMeshRef.current = mesh;
    pendulum.reset();
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

  useLanternMaterial(scene, lanternMeshRef, dissolve);

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

  // Point light following the lantern
  const light = pointLights.characterLantern;
  useControls(
    'CharacterLanternLight',
    pointLightControls(light, {
      offset: {
        value: light.defaults.offset,
        min: -1,
        max: 1,
        step: 0.01,
        onChange: v => {
          light.settings.offset = v;
        },
      },
    })
  );

  useFrame((_, delta) => {
    const swingGroup = swingGroupRef.current;
    const body = characterBody.current;
    const mesh = characterMesh.current;
    if (!swingGroup || !body || !mesh) return;

    // Pin the point light onto the lantern (world space). The offset control
    // is expressed in character space: rotated by the mesh yaw so "in front
    // of the belt" stays in front whichever way the character faces
    const lightPosition = pointLights.characterLantern.position;
    lanternMeshRef.current.getWorldPosition(lightPosition.value);
    LIGHT_OFFSET.set(
      ...pointLights.characterLantern.settings.offset
    ).applyQuaternion(mesh.quaternion);
    lightPosition.value.add(LIGHT_OFFSET);

    const dt = Math.min(delta, 1 / 30);
    if (dt <= 0) return;

    // The mesh only ever yaws; euler.y folds past 90° so read the quaternion
    const q = mesh.quaternion;
    const yaw = 2 * Math.atan2(q.y, q.w);
    const { angX, angZ } = pendulum.step(
      dt,
      body.linvel(),
      yaw,
      body.bodyType() === FIXED
    );

    swingGroup.rotation.set(angX, 0, angZ);
  });
};

useGLTF.preload(LanternModel);

export { useCharacterLantern };
