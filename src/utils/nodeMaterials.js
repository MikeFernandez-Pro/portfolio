import * as THREE from 'three/webgpu';

const NODE_MATERIAL_CLASSES = {
  MeshStandardMaterial: THREE.MeshStandardNodeMaterial,
  MeshPhysicalMaterial: THREE.MeshPhysicalNodeMaterial,
  MeshBasicMaterial: THREE.MeshBasicNodeMaterial,
  MeshLambertMaterial: THREE.MeshLambertNodeMaterial,
  MeshPhongMaterial: THREE.MeshPhongNodeMaterial,
};

/**
 * Node-material twin of a classic material (e.g. one loaded from a GLB), so
 * TSL nodes (colorNode, emissiveNode, outputNode...) can be attached to it.
 * Copies every property the way WebGPURenderer converts classic materials
 * itself, minus the identity fields. Node materials are returned as-is.
 */
const toNodeMaterial = material => {
  if (material.isNodeMaterial) return material;

  const NodeMaterialClass = NODE_MATERIAL_CLASSES[material.type];
  if (!NodeMaterialClass) {
    throw new Error(`toNodeMaterial: no node material for ${material.type}`);
  }

  const nodeMaterial = new NodeMaterialClass();
  for (const key in material) {
    if (key === 'uuid' || key === 'type' || key === 'id') continue;
    nodeMaterial[key] = material[key];
  }
  nodeMaterial.userData = { ...material.userData };
  nodeMaterial.needsUpdate = true;

  return nodeMaterial;
};

export { toNodeMaterial };
