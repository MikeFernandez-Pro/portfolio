import { forwardRef, useMemo } from "react";
import sceneRevealerEffect from "./sceneRevealerEffect";
import { useThree } from "@react-three/fiber";

const SceneRevealer = forwardRef(({}, ref) => {
    const  viewport  = useThree(state => state.viewport);


    const effect = useMemo(() => 
        new sceneRevealerEffect(viewport.aspect)
    , [viewport.aspect]);

    return (
        <primitive ref={ref} object={effect} />
    );
});

export default SceneRevealer;