import * as THREE from 'three/webgpu';

// The character's skinned mesh, as named in Blender
export const CHARACTER_MESH_NAME = 'knight';

/**
 * Adds a group under a bone of the character rig (`bone`: 'Hips', 'Head'...)
 * whose local matrix (boneInverse * bindMatrix) makes its frame coincide
 * with the character glb root frame at bind pose: offsets measured in Blender
 * against the exported character apply verbatim, and every rig scale oddity
 * cancels. A group of the same name left by a previous mount (HMR) is
 * removed first.
 *
 * Returns `{ group, boneOrigin }` (the bone origin at bind pose, in root
 * space), or null when the rig doesn't have the bone.
 */
const attachToBoneInRootFrame = (scene, bone, groupName) => {
  const characterMesh = scene.getObjectByName(CHARACTER_MESH_NAME);
  // GLTFLoader strips ':' from node names: mixamorig:Hips -> mixamorigHips
  let boneObject = scene.getObjectByName(`mixamorig${bone}`);
  if (!boneObject) {
    const suffix = new RegExp(`${bone}$`);
    scene.traverse(object => {
      if (!boneObject && object.isBone && suffix.test(object.name)) {
        boneObject = object;
      }
    });
  }
  if (!characterMesh?.skeleton || !boneObject) return null;

  const { skeleton } = characterMesh;
  const boneIndex = skeleton.bones.indexOf(boneObject);
  if (boneIndex === -1) return null;
  boneObject.getObjectByName(groupName)?.removeFromParent();

  // At bind pose boneWorld * boneInverse * bindMatrix = character root
  const bindLocal = new THREE.Matrix4()
    .copy(skeleton.boneInverses[boneIndex])
    .multiply(characterMesh.bindMatrix);

  const group = new THREE.Group();
  group.name = groupName;
  bindLocal.decompose(group.position, group.quaternion, group.scale);
  boneObject.add(group);

  // The bone origin in root space is the inverse bind translation
  const boneOrigin = new THREE.Vector3().setFromMatrixPosition(
    bindLocal.invert()
  );

  return { group, boneOrigin };
};

export { attachToBoneInRootFrame };
