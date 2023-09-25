import { Box, Instance, Instances, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three"


function useArrayRef() {
    const refs = useRef([]);
    const addRef = function (ref) {
        if (ref && refs.current.indexOf(ref) < 0) {
            refs.current.push(ref);
        }
    };

    return [refs, addRef];
}

const SleepText = () => {

    // const controls = useControls("sleep", {
    //     position: {value: [-11.36, 7.62, -60.64], step: 0.01},
    //     rotation: {value: [0, 0.4, -0.1], step: 0.1},
    //     color: "white",

    // })

    const [elementRefs, setRef] = useArrayRef();

    const addToRefs = (ref) => {
        setRef(ref);
    }

    const onomatopoeiaRefs = [addToRefs, addToRefs, addToRefs]


    // useEffect(() => {
        for (let i = 0; i < elementRefs.current.length; i++) {
            gsap.fromTo(elementRefs.current[i].position, { y: 7.62 }, { y: 8.5, duration: 2, delay: i/1.5 , repeat: -1, ease: "linear" })
            gsap.fromTo(elementRefs.current[i].scale, { x: 0.05, y: 0.05, z: 0.05 }, { x: 0.15, y: 0.15, z: 0.15, duration: 2, delay: i/1.5 , repeat: -1, ease: "linear" })
        }
    // }, [])

    useFrame((state) => {
        const amplitude = 0.05; // Adjust the amplitude of the wave as needed
        const frequency = 2; // Adjust the frequency of the wave as needed
        const offset = -11.35; // Adjust the starting position as needed

        for (let i = 0; i < elementRefs.current.length; i++) {
            elementRefs.current[i].position.x = offset + amplitude * Math.sin(frequency * state.clock.elapsedTime + i * 3);
        }
    })

    return (<>
        <Instances
            limit={3} // Optional: max amount of items (for calculating buffer size)
        >
            <planeGeometry />
            <meshBasicMaterial transparent opacity={0}/>
            {
                onomatopoeiaRefs.map((onomatopoeiaRef, index) => (
                    <Instance
                        key={`onomatopoeiaRef_${index}`}
                        ref={onomatopoeiaRef}
                        scale={0.05}
                        position={[-11.36, 7.62, -60.64]}
                        rotation={[0, 0.4, -0.1]}
                    >
                        <Text
                            font="/fonts/metamorphous.woff"
                        //    color={controls.color}
                        >
                            Z
                        </Text>
                    </Instance>
                ))
            }
        </Instances>
    </>
    );
};

export default SleepText;

