import { useState, Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import Experience from "./Experience.jsx";
import { Bloom, EffectComposer, DepthOfField } from '@react-three/postprocessing'
import SceneRevealer from "./SceneRevealer.jsx";
import { AdaptiveDpr, Box, KeyboardControls, PerformanceMonitor, PerspectiveCamera, Preload } from "@react-three/drei";
import { Leva, useControls } from "leva";
import gsap from "gsap";
import { useStore } from "./ZustandStorage.jsx";
import Joystick from "./Joystick.jsx";
import PositionalAudios from "./PositionalAudios.jsx";

const KEYS_MAP = [
    { name: "forward", keys: ["ArrowUp", "KeyW"] },
    { name: "backward", keys: ["ArrowDown", "KeyS"] },
    { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
    { name: "rightward", keys: ["ArrowRight", "KeyD"] },
    { name: "enter", keys: ["Enter", "NumpadEnter "] }
]

const App = () => {
    const sceneRevealerRef = useRef()

    const [dpr, setDpr] = useState(1.5)

    let { progress, size} = useControls("SceneRevealer", {
        progress: { value: -0.1, min: -0.1, max: 1, step: 0.01 },
        size: { value: 4.5, min: 0, max: 10, step: 0.001 }

    })



    return (
        <>
            <Joystick />
            <div className="grid">
                <h1 className="hero__main-heading">Mike Fernandez</h1>
                <h2 className="hero__secondary-heading">FRONT END DEVELOPER</h2>

                <Suspense fallback={<div className="loader" />}>
                    <div className="experience">
                        <p
                            className="cta"
                            onClick={() =>
                                gsap.to(sceneRevealerRef.current?.uniforms.get("progress"),
                                    { value: 1, duration: 2, ease: "power4.in" })
                            }
                            onTouchStart={() => {
                                useStore.setState({ isMobile: true })

                                gsap.to(sceneRevealerRef.current?.uniforms.get("progress"),
                                    { value: 1, duration: 2, ease: "power4.in" })
                            }}
                        >Enter</p>

                        <Leva collapsed={false} theme={{
                            sizes: { rootWidth: 'auto' },
                        }} />
                        <KeyboardControls
                            map={KEYS_MAP}
                        >
                            <Canvas
                                shadows
                                dpr={dpr}
                                performance={{ min: 0.5 }}
                                camera={{
                                    position: [0, 4.6, 5.3],
                                    rotation: [-Math.PI / 8, 0, 0],
                                    fov: 45,
                                    near: 0.5,
                                    far: 200,
                                }}
                            >
                                <PerformanceMonitor onIncline={() => setDpr(2)} onDecline={() => setDpr(1)} />
                                <AdaptiveDpr pixelated />
                                <EffectComposer disableNormalPass>
                                    {/* <SceneRevealer
                                        ref={sceneRevealerRef}
                                        progress={progress}
                                        size={size}
                                    /> */}
                                    <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={1} intensity={2} />
                                    <DepthOfField
            focusDistance={0} // where to focus
            focalLength={0.15} // focal length
            bokehScale={3} // bokeh size
          /> 
                                </EffectComposer>
                          
                                <Experience />
                                <PositionalAudios />
                                <Preload all />
                            </Canvas>
                        </KeyboardControls>
                    </div>
                </Suspense>
            </div>
        </>
    );
};

export default App;
