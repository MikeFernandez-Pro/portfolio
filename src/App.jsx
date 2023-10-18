import { useState, Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Experience from "./Experience.jsx";
import { AdaptiveDpr, Box, Cloud, KeyboardControls, Loader, PerformanceMonitor, PerspectiveCamera, Plane, Preload, SoftShadows, useProgress } from "@react-three/drei";
import { Leva, useControls } from "leva";
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from "three"
import Particles from "./FBO/Particles.jsx";
import gsap from "gsap";
import CustomEase from "gsap/CustomEase";
import { useStore } from "./ZustandStorage.jsx";
import SceneRevealer from "./SceneRevealer.jsx";
import ReactNipple from 'react-nipple';

gsap.registerPlugin(CustomEase);

const App = (props) => {
    const heroRef = useRef();
    const cameraRef = useRef()
    const sceneRevealerRef = useRef()

    const [dpr, setDpr] = useState(1.5)

    const controls = useControls("camera", {
        cameraPosition: { value: [0, 4.6, 5.3], step: 0.1 },
        cameraRotation: { value: [-Math.PI / 8, 0, 0], step: 0.01 },
    });

    const runExperience = useStore(state => state.runExperience);

    const mouseEventListener = (e) => {
        const { clientX, clientY } = e
        const x = Math.round((clientX / window.innerWidth) * 100)
        const y = Math.round((clientY / window.innerHeight) * 100)

        gsap.to(heroRef.current, {
            '--x': `${x}%`,
            '--y': `${y}%`,
            duration: 0.3,
        })
    }

    useEffect(() => {
        window.addEventListener('mousemove', mouseEventListener)
    }, [])

    let { progress, size } = useControls("SceneRevealer", {
        progress: { value: -0.1, min: -0.1, max: 1, step: 0.01 },
        size: { value: 4.5, min: 0, max: 10, step: 0.001 }

    })


    const isMobile = useStore(state => state.isMobile);

    const joystickAngle = useStore(state => state.joystickAngle);

    return (
        <>
            {
                isMobile &&
                <ReactNipple
                    options={{
                        mode: 'static',
                        position: { top: '50%', left: '50%' },
                        size: 70,
                        dynamicPage: true,
                    }}
                    style={{
                        position: 'absolute',
                        top: "90%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        outline: '1px dashed red',
                        width: 150,
                        height: 150,
                        zIndex: 4,

                    }}
                    onMove={(evt, data) => {
                        useStore.setState({ joystickAngle: data.angle.radian })
                    }
                    }
                />
            }
            <div className="grid">
                <div className="wrapper" >
                    <div className="hero">
                        <h1 className="hero__heading">Mike Fernandez</h1>
                        <h2>FRONT END DEVELOPER</h2>
                    </div>
                    <div ref={heroRef} className="hero hero--secondary" aria-hidden="true">
                        <h1 className="hero__heading">Mike Fernandez</h1>
                    </div>
                </div>

                <Suspense fallback={<div className="loader" />}>
                    <div className="experience">
                        <p className="entry-text" onClick={() => {
                            window.removeEventListener('mousemove', mouseEventListener)

                            gsap.to(sceneRevealerRef.current?.uniforms.get("progress"),
                                { value: 1, duration: 2, ease: "power4.in" })

                        }}
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
                            map={[
                                { name: "forward", keys: ["ArrowUp", "KeyW"] },
                                { name: "backward", keys: ["ArrowDown", "KeyS"] },
                                { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
                                { name: "rightward", keys: ["ArrowRight", "KeyD"] },
                                { name: "enter", keys: ["Enter", "NumpadEnter "] }
                            ]}
                        >
                            <Canvas
                                shadows
                                dpr={dpr}
                                performance={{ min: 0.5 }}
                            // gl={{useLegacyLights: true}}
                            >
                                <PerformanceMonitor onIncline={() => setDpr(2)} onDecline={() => setDpr(1)} />
                                <AdaptiveDpr pixelated />
                                <EffectComposer disableNormalPass>
                                    <SceneRevealer
                                        ref={sceneRevealerRef}
                                        progress={progress}
                                        size={size}
                                    />
                                    <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={1} intensity={2} />
                                    {/* <DepthOfField
            focusDistance={0} // where to focus
            focalLength={0.15} // focal length
            bokehScale={2} // bokeh size
          />  */}

                                </EffectComposer>
                                <PerspectiveCamera
                                    ref={cameraRef}
                                    makeDefault
                                    position={controls.cameraPosition}
                                    rotation={controls.cameraRotation}
                                    fov={45}
                                    near={0.5}  //Previously 0.1, try to change in order to improve bloom postprocessing effect
                                    far={200}
                                />


                                <Experience />
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
