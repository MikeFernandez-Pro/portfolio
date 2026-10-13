// Strips src/assets/animations/Falling.glb (Blender export of the Mixamo
// falling clip) down to what useFallingClip.js plays: the rotation tracks of
// the bones character.glb's rig has, minus the hips (replaced at runtime by
// a leaned rest-pose keyframe). Drops the translation/scale tracks and the
// bones the rig lacks, the mesh-less skin, then the samplers and accessors
// left unused.
// Keyframe data is copied as is. Run once after re-exporting the clip:
//   node scripts/strip-falling-clip.mjs
import { readFileSync, statSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';

const CLIP = 'src/assets/animations/Falling.glb';
const CHARACTER = 'src/assets/models/character/character.glb';
const HIPS = 'mixamorigHips';

// three's PropertyBinding.sanitizeNodeName: track names use these
const sanitize = name => name.replace(/\s/g, '_').replace(/[[\].:/]/g, '');

// Node names straight from the GLB JSON chunk: character.glb is Draco
// compressed, and only its names are needed here
const glbNodeNames = path => {
  const buffer = readFileSync(path);
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString());
  return json.nodes.map(node => sanitize(node.name ?? ''));
};

const rigBones = new Set(glbNodeNames(CHARACTER));
const sizeBefore = statSync(CLIP).size;

const io = new NodeIO();
const document = await io.read(CLIP);
const root = document.getRoot();

let kept = 0;
let dropped = 0;
for (const animation of root.listAnimations()) {
  for (const channel of animation.listChannels()) {
    const bone = sanitize(channel.getTargetNode()?.getName() ?? '');
    const keep =
      channel.getTargetPath() === 'rotation' &&
      rigBones.has(bone) &&
      bone !== HIPS;
    if (keep) {
      kept++;
    } else {
      channel.dispose();
      dropped++;
    }
  }
  const used = new Set(animation.listChannels().map(c => c.getSampler()));
  animation
    .listSamplers()
    .filter(sampler => !used.has(sampler))
    .forEach(sampler => sampler.dispose());
}

// The skin binds no mesh (the file holds only the clip and its bones)
root.listSkins().forEach(skin => skin.dispose());

// Accessors only the dropped samplers / skin read (the Root is their last
// parent)
for (const accessor of root.listAccessors()) {
  if (accessor.listParents().every(parent => parent === root)) {
    accessor.dispose();
  }
}

await io.write(CLIP, document);
console.log(
  `${CLIP}: kept ${kept} channels, dropped ${dropped}; ` +
    `${(sizeBefore / 1024).toFixed(1)} KB -> ${(statSync(CLIP).size / 1024).toFixed(1)} KB`
);
