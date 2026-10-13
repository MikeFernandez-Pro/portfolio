import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei/webgpu';
import * as THREE from 'three/webgpu';

import { useControls } from '#debug/useControls.jsx';
import FallingAnimation from '#assets/animations/Falling.glb';
import { ANIMATION_FALLING as FALLING } from '#character/constants.js';

// Body pitch during the falling animation. The clip's hips rotation track is
// stripped (it made the character dive) and replaced with a single static
// keyframe: hips rest pose pitched by this angle. Baked into the clip data so
// the mixer crossfade blends the lean in with the rest of the pose instead of
// the whole mesh snapping to it
const DEFAULT_FALLING_BODY_ANGLE = 56;

const PITCH_AXIS = new THREE.Vector3(1, 0, 0);

// Write the pitched hips pose into the falling clip's hips keyframe. `chain`
// maps the pitch (expressed in character space, like the old mesh tilt) into
// the hips' parent space; live-updating the track values is picked up by the
// mixer on the next frame
const bakeFallingBodyAngle = ({ track, rest, chain }, angle) => {
  const pitch = new THREE.Quaternion().setFromAxisAngle(PITCH_AXIS, angle);
  const q = chain
    .clone()
    .invert()
    .multiply(pitch)
    .multiply(chain)
    .multiply(rest);
  track.values.set([q.x, q.y, q.z, q.w]);
};

/**
 * The character clips plus the falling clip, retargeted onto the rig.
 *
 * The falling animation lives in a separate animation-only GLB (Blender
 * export of the Mixamo clip, same mixamorig:* rig as the character),
 * stripped offline by scripts/strip-falling-clip.mjs to the rotation tracks
 * of the bones the character rig has. Its hips rotation is dropped there too
 * (it pitches the body into a dive): here it's replaced with a static
 * rest-pose keyframe leaned by the body angle.
 */
const useFallingClip = (scene, animations) => {
  const fallingGltf = useGLTF(FallingAnimation);
  const hipsRef = useRef(null);
  const angleRef = useRef((DEFAULT_FALLING_BODY_ANGLE * Math.PI) / 180);

  const mergedAnimations = useMemo(() => {
    const clip = fallingGltf.animations[0].clone();
    clip.name = FALLING;

    // Rest pose captured before the mixer ever poses the rig, and the
    // rotation chain from the character root down to the hips' parent so the
    // pitch can be expressed in character space
    const hips = scene.getObjectByName('mixamorigHips');
    const rest = hips.quaternion.clone();
    const chain = new THREE.Quaternion();
    const ancestors = [];
    for (let node = hips.parent; node && node !== scene; node = node.parent) {
      ancestors.unshift(node);
    }
    ancestors.forEach(node => chain.multiply(node.quaternion));
    const track = new THREE.QuaternionKeyframeTrack(
      'mixamorigHips.quaternion',
      [0],
      [rest.x, rest.y, rest.z, rest.w]
    );
    hipsRef.current = { track, rest, chain };
    bakeFallingBodyAngle(hipsRef.current, angleRef.current);
    clip.tracks.push(track);

    return [...animations, clip];
  }, [animations, fallingGltf, scene]);

  // Debug: the body pitch applied while falling (the controller adds the
  // preview buttons to the same folder)
  useControls('Falling', {
    bodyAngle: {
      value: DEFAULT_FALLING_BODY_ANGLE,
      min: -90,
      max: 90,
      step: 1,
      onChange: v => {
        angleRef.current = (v * Math.PI) / 180;
        if (hipsRef.current) {
          bakeFallingBodyAngle(hipsRef.current, angleRef.current);
        }
      },
    },
  });

  return mergedAnimations;
};

export { useFallingClip };
