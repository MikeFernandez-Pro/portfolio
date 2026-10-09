/**
 * A skinned island.glb node remounted with its own material (the GLB scene
 * itself is never mounted). Extra props go to the mesh.
 */
const GlbSkinnedMesh = ({ node, ...props }) => (
  <skinnedMesh
    name={node.name}
    geometry={node.geometry}
    skeleton={node.skeleton}
    morphTargetDictionary={node.morphTargetDictionary}
    morphTargetInfluences={node.morphTargetInfluences}
    {...props}
  />
);

export { GlbSkinnedMesh };
