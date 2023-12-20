import { forwardRef, useMemo } from "react";
import sceneRevealerEffect from "./sceneRevealerEffect";
import { useThree } from "@react-three/fiber";

const SceneRevealer = forwardRef(({ progress, size }, ref) => {
    const  viewport  = useThree(state => state.viewport);


    const effect = useMemo(() => 
        new sceneRevealerEffect(progress, size, viewport.aspect)
    , [viewport.aspect, progress]);

    return (
        <primitive ref={ref} object={effect} />
    );
});

export default SceneRevealer;