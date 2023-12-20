import { useState, Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import Experience from "./Experience.jsx";
import { Bloom, EffectComposer, DepthOfField, ToneMapping } from '@react-three/postprocessing'
import SceneRevealer from "./SceneRevealer.jsx";
import { AdaptiveDpr, Box, PerformanceMonitor, PerspectiveCamera, Preload } from "@react-three/drei";
import { Leva, useControls } from "leva";
import gsap from "gsap";
import { useStore } from "./ZustandStorage.jsx";
import Joystick from "./Joystick.jsx";
import PositionalAudios from "./PositionalAudios.jsx";
import * as THREE from "three";
import { BlendFunction } from "postprocessing";

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
        progress: { value: 0, min: -0.1, max: 1, step: 0.01 },
        size: { value: 15, min: 0, max: 50, step: 0.001 }

    })

    const controls = useControls("toneMapping", {
        blendFunction: {options: [
            BlendFunction.ADD,
            BlendFunction.AVERAGE,
            BlendFunction.DARKEN,
            BlendFunction.HUE,
            BlendFunction.LIGHTEN,
            BlendFunction.LINEAR_DODGE,
            BlendFunction.SRC,
            BlendFunction.SCREEN,
        ]}
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
                                    { value: 1, duration: 7, ease: "expo.out" })
                            }
                            onTouchStart={() => {
                                useStore.setState({ isMobile: true })

                                gsap.to(sceneRevealerRef.current?.uniforms.get("progress"),
                                    { value: 1, duration: 7, ease: "expo.out" })
                            }}
                        >Enter</p>

                        <Leva collapsed={true} theme={{
                            sizes: { rootWidth: 'auto' },
                        }} />
                            <Canvas
                                shadows
                                dpr={dpr}
                                performance={{ min: 0.5 }}
                                camera={{
                                    position: [0, 4.6, 5.3],
                                    rotation: [-Math.PI / 8, 0, 0],
                                    fov: 40,
                                    near: 0.5,
                                    far: 200,
                                }}
                                gl={{
                                    powerPreference: "high-performance",
                                    antialias: true,
                                    toneMapping: THREE.LinearToneMapping,
                                }}
                            >
                                
                                <PerformanceMonitor onIncline={() => setDpr(2)} onDecline={() => setDpr(1)} />
                                <AdaptiveDpr pixelated />
                                <EffectComposer disableNormalPass multisampling={0}>
                                    {/* <SceneRevealer
                                        ref={sceneRevealerRef}
                                        progress={progress}
                                        size={size}
                                    /> */}
                                    <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={1} intensity={2} blendFunction={controls.blendFunction} />
                                    <ToneMapping blendFunction={BlendFunction.DARKEN} />
                                    {/* <DepthOfField
                                    resolutionX={1024}
                                    resolutionY={1024}
                                    focusDistance={ 1.5 }
                                    focalLength={ 3 }
                                    bokehScale={ 8 }
          />  */}
                                </EffectComposer>
                          
                                <Experience />
                                {/* <PositionalAudios /> */}
                                <Preload all />
                            </Canvas>
                    </div>
                </Suspense>
            </div>
        </>
    );
};

export default App;
