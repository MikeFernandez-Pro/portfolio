import { Bloom, EffectComposer } from '@react-three/postprocessing'
import SceneRevealer from "./SceneRevealer.jsx";
import { useStore } from 'zustand';
import { useEffect, useRef } from 'react';

const PostProcessing = (props) => {

    const revealScene = useStore(state => state.revealScene);
    const sceneRevealerRef = useRef();

    // useEffect(
    //     // gsap.to(sceneRevealerRef.current?.uniforms.get("progress"),
    //     //     { value: 1, duration: 2, ease: "power4.in" })
    // )

    return (<>
        {/* <SceneRevealer
ref={sceneRevealerRef}
progress={progress}
size={size}
/> */}
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={1} intensity={2} />
        {/* <DepthOfField
            focusDistance={0} // where to focus
            focalLength={0.15} // focal length
            bokehScale={2} // bokeh size
          />  */}
    </>

    );
};

export default PostProcessing;