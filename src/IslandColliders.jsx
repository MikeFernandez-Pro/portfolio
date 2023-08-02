import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { MeshBasicMaterial } from "three";
import { useStore } from "./ZustandStorage";

const IslandColliders = (props) => {

    const { nodes, materials } = useGLTF("/models/IslandCollider.glb");
    const collidersPosition = [-1.35, 2.3, -15];
    const collidersMaterial = new MeshBasicMaterial({ visible: false });

    const setMagicCircleActivation = useStore(state => state.setMagicCircleActivation)

    const setActivePlate = useStore(state => state.setActivePlate)
    
    return (
        <>
            <RigidBody type={"fixed"} colliders={"trimesh"}>
                <mesh
                    scale={0.45}
                    position={collidersPosition}
                    geometry={nodes.Collider.geometry}
                    material={collidersMaterial}
                />
            </RigidBody>
            <RigidBody      
                type={"fixed"}
                colliders={"trimesh"}
                onCollisionEnter={() => {
                    setMagicCircleActivation()
                    
                }}
            >
                <mesh
                    scale={0.45}
                    position={collidersPosition}
                    geometry={nodes.magicCircle.geometry}
                    material={collidersMaterial}
                />
            </RigidBody>
            <RigidBody      
                type={"fixed"}
                colliders={"trimesh"}
                onCollisionEnter={() => {
                    setActivePlate("portalPlate")
                }}
            >
                <mesh
                    scale={0.45}
                    position={collidersPosition}
                    geometry={nodes.portalPlate.geometry}
                    material={collidersMaterial}
                />
            </RigidBody>
            <RigidBody      
                type={"fixed"}
                colliders={"trimesh"}
                onCollisionEnter={() => {
                    setActivePlate("seaPlate")
                }}
            >
                <mesh
                    scale={0.45}
                    position={collidersPosition}
                    geometry={nodes.seaPlate.geometry}
                    material={collidersMaterial}
                />
            </RigidBody>
            <RigidBody      
                type={"fixed"}
                colliders={"trimesh"}
                onCollisionEnter={() => {
                        setActivePlate("galaxyPlate")
                }}
            >
                <mesh
                    scale={0.45}
                    position={collidersPosition}
                    geometry={nodes.galaxyPlate.geometry}
                    material={collidersMaterial}
                />
            </RigidBody>
        </>
    );
};

useGLTF.preload("/models/IslandCollider.glb");

export default IslandColliders;
