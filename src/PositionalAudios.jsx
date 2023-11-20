import { PositionalAudio } from "@react-three/drei";
import { useEffect, useRef } from "react";

const PositionalAudios = (props) => {

const ref = useRef()
    
    useEffect(() => {
    }, []
    )
    return (
<>
        <group position={[-5.8, 1.8, -16.6]} >
           <PositionalAudio ref={ref} autoplay loop distance={0.8} url="/sounds/torches.ogg"/>
        </group>

        <group position={[-18.3, 5.9, -35.8]} >
           <PositionalAudio ref={ref} autoplay loop distance={0.8} url="/sounds/torches.ogg"/>
        </group>

        <group position={[-18.5, 5.9, -31.0]} >
           <PositionalAudio ref={ref} autoplay loop distance={0.8} url="/sounds/torches.ogg"/>
        </group>

        <group position={[-13.9, 5.9, -35.6]} >
           <PositionalAudio ref={ref} autoplay loop distance={0.8} url="/sounds/torches.ogg"/>
        </group>

        <group position={[-10.9, 8, -46.8]} >
           <PositionalAudio ref={ref} autoplay loop distance={0.8} url="/sounds/torches.ogg"/>
        </group>

        <group position={[-15.3, 7.8, -52.9]} >
           <PositionalAudio ref={ref} autoplay loop distance={0.8} url="/sounds/torches.ogg"/>
        </group>

        <group position={[-4.7, 7.9, -52.9]} >
           <PositionalAudio ref={ref} autoplay loop distance={0.8} url="/sounds/torches.ogg"/>
        </group>

        <group position={[-6.3, 8.6, -58.0]} >
           <PositionalAudio ref={ref} autoplay loop distance={1.3} url="/sounds/torches.ogg"/>
        </group>

        <group position={[-13.1, 8.6, -58.0]} >
           <PositionalAudio ref={ref} autoplay loop distance={1.3} url="/sounds/torches.ogg"/>
        </group>

        <group position={[-1.4, 7.1, -55.9]} >
           <PositionalAudio ref={ref} autoplay loop distance={1.8} url="/sounds/torches.ogg"/>
        </group>

        </>

        
    );
};

export default PositionalAudios;