import { forwardRef } from "react";
import sceneRevealerEffect from "./sceneRevealerEffect";
import { useControls } from "leva";

const SceneRevealer = ({progress, thickness}, ref) => {

    const effect = new sceneRevealerEffect(progress, thickness);

    
    return (    
        <primitive ref={ref} object={effect} />    
    );
};

export default forwardRef(SceneRevealer);