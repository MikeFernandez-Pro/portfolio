import { useState, Suspense, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import Experience from "./Experience.jsx";
import { AdaptiveDpr, Cloud, KeyboardControls, Loader, PerformanceMonitor, PerspectiveCamera, Plane, Preload, SoftShadows } from "@react-three/drei";
import { Leva, useControls } from "leva";
import { BlurPass, Resizer, KernelSize } from 'postprocessing'
import { Joystick } from "react-joystick-component";
import { Bloom, SelectiveBloom, BrightnessContrast, DepthOfField, EffectComposer, Noise, Vignette, SSAO } from '@react-three/postprocessing'
import * as THREE from "three"
import Particles from "./FBO/Particles.jsx";
import gsap from "gsap";
import CustomEase from "gsap/CustomEase";
import tunnel from 'tunnel-rat'

const ui = tunnel()
gsap.registerPlugin(CustomEase);

const App = (props) => {
    const [joystickAngle, setJoystickAngle] = useState(0);

    //renderer.shadowMap.type = THREE.PCFSoftShadowMapqa
    const [dpr, setDpr] = useState(1.5)

    const controls = useControls("camera", {
        cameraPosition: { value: [8, 46, 20], step: 0.1 },
        cameraRotation: { value: [0, 0, 0], step: 0.01 },

        //camera
        // 8, 46, 20,
        // -0.44, 0.28, 0.13

        //FBO
        //< 8 46 10>
        // 0 0 0


    });

    const cameraRef = useRef()

    const loadExperience = () => {
        gsap.to(cameraRef.current.position, {
            x: 0,
            y: 3.4,
            z: 5.5,
            duration: 4.5,
            ease:
                CustomEase.create("custom", "M0,0,C0,0,0.706,1.009,0.784,1.01,0.872,1.01,0.911,1,0.964,1,1,1,1,1,1,1")
        })
        gsap.to(cameraRef.current.rotation, {
            x: -Math.PI / 8,
            y: 0,
            z: 0,
            duration: 4,
            ease:
                CustomEase.create("custom", "M0,0,C0,0,0.706,1.009,0.784,1.01,0.872,1.01,0.911,1,0.964,1,1,1,1,1,1,1")
        })
    }

    return (
        <>
            {/* tunnel */}
            <ui.Out />

            <h1 id="loader" onClick={() => loadExperience()}>CLICK ON ME !</h1>

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
                    // camera={{
                    //     fov: 45,
                    //     near: 0.1,
                    //     far: 200,
                    //     position: [0, 3.4, 5.5],
                    //     rotation: [-Math.PI / 8, 0, 0],
                    // }}
                    dpr={dpr}
                    performance={{ min: 0.5 }}
                >
                    <PerformanceMonitor onIncline={() => setDpr(2)} onDecline={() => setDpr(1)} />
                    <AdaptiveDpr pixelated />
                    <EffectComposer disableNormalPass>
                        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={1} intensity={2} />
                        {/* <DepthOfField
    focusDistance={0} // where to focus
    focalLength={0.15} // focal length
    bokehScale={2} // bokeh size
  /> */}
                    </EffectComposer>
                    <PerspectiveCamera
                        ref={cameraRef}
                        makeDefault
                        position={controls.cameraPosition}
                        rotation={controls.cameraRotation}
                        fov={45}
                        near={0.5} // Previously 0.1, try to change in order to improve bloom postprocessing effect
                        far={200}

                    />

                    <Cloud position={[8, 46, -20]} speed={0.2} opacity={0.3} />
                    

                    <Particles />

                    
                    <Suspense fallback={<ui.In>
                         <span className="loader"></span>
                    </ui.In>}>
                        <Experience
                            joystickAngle={joystickAngle}
                        />
                        <Preload all />
                    </Suspense>
                </Canvas>
                {/* <Loader /> */}
            </KeyboardControls>
        </>
    );
};

export default App;
