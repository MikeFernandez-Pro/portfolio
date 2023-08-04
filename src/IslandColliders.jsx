import { useGLTF, Instances, Instance } from "@react-three/drei";
import { InstancedRigidBodies, RigidBody } from "@react-three/rapier";
import { BoxGeometry, MeshBasicMaterial } from "three";
import { useStore } from "./ZustandStorage";
import { extend } from "@react-three/fiber";
import { useMemo, useRef } from "react";



const IslandColliders = (props) => {

    const { nodes, materials } = useGLTF("/models/IslandCollider.glb");
    const collidersPosition = useMemo(() => [-1.35, 2.3, -15], []);
    const collidersMaterial = useMemo(() => new MeshBasicMaterial({ visible: false }), [])

    const setMagicCircleActivation = useStore(state => state.setMagicCircleActivation)

    const setActivePlate = useStore(state => state.setActivePlate)

    const pressurePlatesGeometry = useMemo(() => new BoxGeometry(1, 1, 1), [])
    const pressurePlatesMaterial = useMemo(() => new MeshBasicMaterial({ color: "red" }), [])
        
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
                colliders={"cuboid"}
                onCollisionEnter={() => {
                    setActivePlate("portalPlate")
                }}
                position={[-15.085, 4.4, -32.45]}
            >
                <mesh
                   scale={0.95}
                    geometry={pressurePlatesGeometry}
                    material={collidersMaterial}
                />
            </RigidBody>
            <RigidBody     
                type={"fixed"}
                colliders={"cuboid"}
                onCollisionEnter={() => {
                    setActivePlate("seaPlate")
                }}
                position={[-15.085, 4.4, -34.495]}
            >
                <mesh
                   scale={0.95}
                    geometry={pressurePlatesGeometry}
                    material={collidersMaterial}
                />
            </RigidBody>
            <RigidBody      
                type={"fixed"}
                colliders={"cuboid"}
                onCollisionEnter={() => {
                        setActivePlate("galaxyPlate")
                }}
                position={[-17.14, 4.4, -34.495]}
            >
                <mesh
                    scale={0.95}
                    geometry={pressurePlatesGeometry}
                    material={collidersMaterial}
                />
            </RigidBody>
        </>
    );
};

useGLTF.preload("/models/IslandCollider.glb");

export default IslandColliders;
