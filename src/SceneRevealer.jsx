import { forwardRef } from "react";
import sceneRevealerEffect from "./sceneRevealerEffect";
import { useControls } from "leva";
import { useThree } from "@react-three/fiber";

const SceneRevealer = ({progress, thickness, offset, size}, ref) => {
    const {viewport} = useThree();

    const effect = new sceneRevealerEffect(progress, thickness, offset, size, viewport.aspect);
    
    return (    
        <primitive ref={ref} object={effect} />    
    );
};

export default forwardRef(SceneRevealer);