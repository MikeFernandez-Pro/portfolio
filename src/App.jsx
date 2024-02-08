import { useState, Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Experience from "./Experience.jsx";
import { Bloom, EffectComposer, Outline, ToneMapping } from "@react-three/postprocessing";
import SceneRevealer from "./SceneRevealer.jsx";
import { AdaptiveDpr, Bvh, PerformanceMonitor, Preload, useProgress } from "@react-three/drei";
import gsap from "gsap";
import { useStore } from "./ZustandStorage.jsx";
import Joystick from "./Joystick.jsx";
import * as THREE from "three";
import { BlendFunction } from "postprocessing";
import tunnel from "tunnel-rat";

import soundOnIcon from "/sound-on.svg";
import soundOffIcon from "/sound-off.svg";

/* Create a tunnel. */
const ui = tunnel();
const MODELS_AMOUNT = 22;

const App = () => {
    const sceneRevealerRef = useRef();
    const soundOnIconRef = useRef();
    const soundOffIconRef = useRef();
    const startExperienceRef = useRef();


    const [dpr, setDpr] = useState(1.5);

    const { loaded } = useProgress();


    const initiateExperience = () => {
        useStore.setState({ experienceStarted: true });
        // if (sceneRevealerRef.current && loaded === MODELS_AMOUNT) {)


        startExperienceRef.current.style.opacity = 1;
        gsap.to(startExperienceRef.current.style, {
            opacity: 0,
            duration: 0.5,
            delay: 0.5,
            onComplete: () => {
                startExperienceRef.current.style.display = "none";
            },
        });

        // loadingPortalRef.current.style.opacity = 1;
        // gsap.to(loadingPortalRef.current.style, {
        //     opacity: 0,
        //     duration: 0.5,
        //     delay: 0.4,
        //     onComplete: () => {
        //         loadingPortalRef.current.style.display = "none";
        //     },
        // });

        gsap.to(sceneRevealerRef.current?.uniforms.get("progress"), {
            value: 1.5,
            duration: 5,
            ease: "expo.isOut",
        });

        gsap.to(soundOnIconRef.current.style, { opacity: 0.9, duration: 0.5, delay: 3 });
    };

    return (
        <>
            <ui.Out />
            <img
                ref={soundOnIconRef}
                src={soundOnIcon}
                style={{ opacity: 0 }}
                className="volume-controller"
                alt="Sound on button"
                onClick={() => {
                    soundOnIconRef.current.style.display = "none";
                    soundOffIconRef.current.style.display = "block";
                    useStore.setState({ soundActivated: false });
                }}
            />
            <img
                ref={soundOffIconRef}
                src={soundOffIcon}
                style={{ display: "none" }}
                className="volume-controller"
                alt="Sound down button"
                onClick={() => {
                    soundOffIconRef.current.style.display = "none";
                    soundOnIconRef.current.style.display = "block";
                    useStore.setState({ soundActivated: true });
                }}
            />
            <Canvas
                shadows
                dpr={dpr}
                performance={{ min: 0.5 }}
                camera={{
                    position: [-3.5, 17.4, 29.6],
                    // position: [0, 30, 70],
                    // position: [0, 5.2, 5.5],
                    rotation: [-Math.PI / 8, 0, 0],
                    fov: 40,
                    near: 0.5,
                    far: 1000,
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
                    <Bloom
                        mipmapBlur
                        luminanceThreshold={1}
                        luminanceSmoothing={1}
                        intensity={2}
                    />
                    <ToneMapping blendFunction={BlendFunction.DARKEN} />
                    {/* <DepthOfField
                                    resolutionX={1024}
                                    resolutionY={1024}
                                    focusDistance={ 1.5 }
                                    focalLength={ 3 }
                                    bokehScale={ 8 }
          />  */}
                </EffectComposer>

                <Suspense
                    fallback={
                        <ui.In>
                            <div className="container">
                                <p className="loader">
                                    {Math.ceil((loaded / MODELS_AMOUNT) * 100)}
                                </p>
                            </div>
                        </ui.In>
                    }
                >
                    <ui.In>
                        <div ref={startExperienceRef} className="container">
                            <button
                                className={"start-experience"}
                                onClick={initiateExperience}
                            >
                                Enter
                            </button>
                        </div>
                    </ui.In>
                    <Bvh firstHitOnly>
                        <Experience />
                    </Bvh>
                </Suspense>
                <Preload all />
            </Canvas>
        </>
    );
};

export default App;
