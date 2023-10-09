import { useState, Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Experience from "./Experience.jsx";
import { AdaptiveDpr, Box, Cloud, KeyboardControls, Loader, PerformanceMonitor, PerspectiveCamera, Plane, Preload, SoftShadows, useProgress } from "@react-three/drei";
import { Leva, useControls } from "leva";
import { Joystick } from "react-joystick-component";
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from "three"
import Particles from "./FBO/Particles.jsx";
import gsap from "gsap";
import CustomEase from "gsap/CustomEase";
import { useStore } from "./ZustandStorage.jsx";
import SceneRevealer from "./SceneRevealer.jsx";

gsap.registerPlugin(CustomEase);

const App = (props) => {
    const heroRef = useRef();
    const cameraRef = useRef()
    const sceneRevealerRef = useRef()

    const [joystickAngle, setJoystickAngle] = useState(0);
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

    const [enableCanvas, setEnableCanvas] = useState(false)


    let { progress, thickness, offset, size } = useControls("SceneRevealer", {
        progress: { value: 0.2, min: -1, max: 10, step: 0.01 },
        thickness: { value: 6.17, min: 0, max: 20, step: 0.01 },
        offset: { value: 0, min: -0.1, max: 5, step: 0.001 },
        size: { value: 0, min: 0, max: 1, step: 0.001 }

    })




    return (
        <>
            <div className="grid">
                <div className="wrapper" >
                    <div className="hero">
                        <h1 className="hero__heading">Mike Fernandez</h1>
                    </div>
                    <div ref={heroRef} className="hero hero--secondary" aria-hidden="true">
                        <h1 className="hero__heading">Mike Fernandez</h1>
                    </div>
                </div>

                <Suspense fallback={<div className="loader" />}>
                    <div className="experience">
                        <p className="entry-text" onClick={() => {
                            window.removeEventListener('mousemove', mouseEventListener)
                            setEnableCanvas(true);

                            // gsap.to(sceneRevealerRef.current?.uniforms.get("size"),
                            //     { value: 0.65, duration: 2.5, ease: "steps(3)" })

                            gsap.to(sceneRevealerRef.current?.uniforms.get("size"),
                                { value: 0.8, duration: 1.8, ease: CustomEase.create("custom", "M0,0 C0,0 0.199,0.309 0.2,0.326 0.215,0.326 0.386,0.328 0.402,0.328 0.402,0.344 0.603,0.637 0.604,0.654 0.619,0.654 0.8,0.652 0.8,0.652 0.8,0.668 1,1 1,1 ") })


                                
                            gsap.to(sceneRevealerRef.current?.uniforms.get("thickness"),
                                { value: 0, duration: 2, delay: 1.8, ease: "power4.out"})

                            gsap.to(sceneRevealerRef.current?.uniforms.get("offset"),
                                { value: 8, duration: 2, delay: 1.8, })


                        }}
                        >Enter</p>

                        {/* <Joystick
                         size={100}
                         sticky={false} 
                         baseColor="hsla(232, 7%, 20%, 0.5)"
                         stickColor="hsla(232, 7%, 20%, 1)"
                         move={(e) => {
                             setJoystickAngle(Math.atan2(e.y, e.x));
                         }}
                         stop={() => setJoystickAngle(0)}
                     ></Joystick> */}
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
                                        thickness={thickness}
                                        offset={offset}
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


                                <Experience
                                    joystickAngle={joystickAngle}
                                    visible={false}
                                />
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
