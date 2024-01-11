import { useState, Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import Experience from "./Experience.jsx";
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import SceneRevealer from "./SceneRevealer.jsx";
import { AdaptiveDpr, Bvh, PerformanceMonitor, Preload } from "@react-three/drei";
import { Leva } from "leva";
import gsap from "gsap";
import { useStore } from "./ZustandStorage.jsx";
import Joystick from "./Joystick.jsx";
import * as THREE from "three";
import { BlendFunction } from "postprocessing";

const App = () => {
    const sceneRevealerRef = useRef()
    const perfMonitorRef = useRef()

    const [dpr, setDpr] = useState(1.5)

    return (
        <>
            {/* <Joystick /> */}
            <div className="grid">
                <h1 className="hero__main-heading">Mike Fernandez</h1>
                <h2 className="hero__secondary-heading">Front-end Developer</h2>

                <Suspense fallback={<div className="container"><div className="loader" /></div>}>
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
                    >discover</p>
                    <Leva collapsed={true} theme={{
                        sizes: { rootWidth: 'auto' },
                    }} />
                    <div className="experience">
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
                                <SceneRevealer ref={sceneRevealerRef} />
                                <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={1} intensity={2} />
                                <ToneMapping blendFunction={BlendFunction.DARKEN} />
                                {/* <DepthOfField
                                    resolutionX={1024}
                                    resolutionY={1024}
                                    focusDistance={ 1.5 }
                                    focalLength={ 3 }
                                    bokehScale={ 8 }
          />  */}
                            </EffectComposer>

                            <Bvh firstHitOnly>
                                <Experience />
                            </Bvh>
                            <Preload all />
                        </Canvas>
                    </div>
                </Suspense>
            </div>
        </>
    );
};

export default App;
