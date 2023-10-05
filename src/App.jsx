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
import SceneRevealer from  "./SceneRevealer.jsx";

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

    let {progress, thickness} = useControls("SceneRevealer", {
        progress: {value: -0.2, min: -0.2, max: 5, step: 0.01},
        thickness: {value: 1.76, min: 0, max: 10, step: 0.01}
    }  )



    return (
        <>
        <div className="layout"/>
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
                       gsap.to(sceneRevealerRef.current?.uniforms.get("progress"),
                       {value: 0.18, duration: 1, ease: "expo"})

                    //    gsap.to(sceneRevealerRef.current?.uniforms.get("progress"),
                    //    {value: 2, duration: 1.5, ease: "easeIn", delay: 0.8})
                    //    gsap.to(sceneRevealerRef.current?.uniforms.get("thickness"),
                    //    {value: 0.7, duration: 0.5, ease:zaq "easeIn", delay: 0.8})
                       

                       
                    //    gsap.to(sceneRevealerRef.current?.uniforms.get("progress"),
                    //    {value: 1, duration: 0.5, ease: "easeIn", delay: 1.4})
                       
                       
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
                                <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={1} intensity={2} />
                                {/* <DepthOfField
            focusDistance={0} // where to focus
            focalLength={0.15} // focal length
            bokehScale={2} // bokeh size
          />  */}
          <SceneRevealer ref={sceneRevealerRef} progress={progress} thickness={thickness}/>
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
