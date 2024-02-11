import { forwardRef, useMemo } from "react";
import sceneRevealerEffect from "./sceneRevealerEffect";
import { useFrame, useThree } from "@react-three/fiber";

const SceneRevealer = forwardRef(({}, ref) => {
    const viewport = useThree((state) => state.viewport);

    const effect = useMemo(() => new sceneRevealerEffect(viewport.aspect), [viewport.aspect]);

    useFrame(({ clock }) => {
        if (ref.current) {
            ref.current.uniforms.get("uTime").value = clock.elapsedTime;
        }
    });

    return <primitive ref={ref} object={effect} />;
});

export default SceneRevealer;
