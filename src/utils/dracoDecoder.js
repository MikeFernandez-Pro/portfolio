import { useGLTF } from '@react-three/drei/webgpu';
import { DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';

// useGLTF fetches its Draco decoder from gstatic by default: use three's own
// copy instead, emitted with the build. Side-effect module, imported first by
// index.jsx: the useGLTF.preload calls create their loader when their module
// is evaluated, so the path must be set before any of them
useGLTF.setDecoderPath(DRACO_GLTF_CONFIG);
