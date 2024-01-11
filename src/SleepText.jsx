"use strict";

import { Instance, Instances, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

const LETTERS_COUNT = 3;
let currentCount = 0;

const SleepText = () => {

    const lettersRefs = useRef(new Array(LETTERS_COUNT));

    const addRef = useCallback((ref) => {
        if (ref && currentCount < LETTERS_COUNT) {
            lettersRefs.current[currentCount++] = ref;
        }
    }, [lettersRefs, currentCount]);

    const lettersArray = useMemo(() => new Array(LETTERS_COUNT).fill(addRef), []);

    useLayoutEffect(() => {
        for (let i = 0; i < lettersRefs.current.length; i++) {
            if (lettersRefs.current[i]) {
                gsap.fromTo(lettersRefs.current[i].position, { y: 7.62 }, { y: 8.5, duration: 2, delay: i / 1.5, repeat: -1, ease: "linear" })
                gsap.fromTo(lettersRefs.current[i].scale, { x: 0.05, y: 0.05, z: 0.05 }, { x: 0.15, y: 0.15, z: 0.15, duration: 2, delay: i / 1.5, repeat: -1, ease: "linear" })
            }
        }
    }, [])

    useFrame((state) => {
        // Letters sinusoidal movement confiuration
        const amplitude = 0.05;
        const frequency = 2;
        const offset = -11.35;

        for (let i = 0; i < lettersRefs.current.length; i++) {
            if (lettersRefs.current[i])
                lettersRefs.current[i].position.x = offset + amplitude * Math.sin(frequency * state.clock.elapsedTime + i * 3);
        }
    })

    return (<>
        <Instances
            limit={3} // Optional: max amount of items (for calculating buffer size)
        >
            <planeGeometry />
            <meshBasicMaterial transparent opacity={0} />
            {
                lettersArray.map((onomatopoeiaRef, index) => (
                    <Instance
                        key={`onomatopoeiaRef_${index}`}
                        ref={onomatopoeiaRef}
                        scale={0.05}
                        position={[-11.36, 7.62, -60.64]}
                        rotation={[0, 0.4, -0.1]}
                    >
                        <Text
                            font="/fonts/metamorphous.woff"
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

