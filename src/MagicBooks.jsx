import { useAnimations, useGLTF } from "@react-three/drei";
import DissolveEffectShaderMaterial from "./DissolveMaterial";
import { useEffect } from "react";

const MagicBooks = ({islandPosition, activation}) => {

    const { nodes, materials, animations, scene }  = useGLTF("/models/magicBooks.glb")
    
    const magicBooksAnimations = useAnimations(animations, scene)

    useEffect(() => {
        magicBooksAnimations.actions["levitating"].play()
    }, [])
    return (
          <mesh 
           position={islandPosition}
           scale={0.45}
            castShadow
            receiveShadow
            geometry={nodes.magicBooks.geometry}
            morphTargetDictionary={nodes.magicBooks.morphTargetDictionary}
            morphTargetInfluences={nodes.magicBooks.morphTargetInfluences}
          >
            <DissolveEffectShaderMaterial baseMaterial={materials.islandTexture} activation={activation}/>
          </mesh>
      );
};

export default MagicBooks;