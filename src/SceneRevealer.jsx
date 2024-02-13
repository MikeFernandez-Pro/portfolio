import { forwardRef, useEffect, useMemo } from "react";
import sceneRevealerEffect from "./sceneRevealerEffect";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";

const SceneRevealer = forwardRef(({}, ref) => {
    const viewport = useThree((state) => state.viewport);

    const effect = useMemo(() => new sceneRevealerEffect(viewport.aspect), [viewport.aspect]);

    useEffect(() => {
        gsap.to(ref.current?.uniforms.get("progress"), {
            value: 0.35,
            duration: 1,
            delay: 0.5,
            ease: "circ.out",
        });
    }, []);

    useFrame(({ clock }) => {
        if (ref.current) {
            ref.current.uniforms.get("uTime").value = clock.elapsedTime;
        }
    });

    return <primitive ref={ref} object={effect} />;
});

export default SceneRevealer;
