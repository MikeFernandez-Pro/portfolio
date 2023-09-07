import { useState, Suspense, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import Experience from "./Experience.jsx";
import { AdaptiveDpr, KeyboardControls, Loader, PerformanceMonitor, Preload } from "@react-three/drei";
import { Leva } from "leva";
import { BlurPass, Resizer, KernelSize } from 'postprocessing'
import { Joystick } from "react-joystick-component";
import { Bloom, SelectiveBloom, BrightnessContrast, DepthOfField, EffectComposer, Noise, Vignette, SSAO } from '@react-three/postprocessing'
import * as THREE from "three"

const App = (props) => {
    const [joystickAngle, setJoystickAngle] = useState(0);

    //renderer.shadowMap.type = THREE.PCFSoftShadowMapqa
    const [dpr, setDpr] = useState(1.5)

    return (
        <>
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
                    { name: "enter", keys: ["Enter", "NumpadEnter "]}
                ]}
            >
                <Canvas
                    shadows
                    camera={{
                        fov: 45,
                        near: 0.1,
                        far: 200,
                        position: [0, 3.4, 5.5],
                        rotation: [-Math.PI / 8, 0, 0],
                    }}
                    dpr={dpr}
                    performance={{ min: 0.5  }}
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
    {/* <SelectiveBloom
    lights={[]} // ⚠️ REQUIRED! all relevant lights
    selection={[]} // selection of objects that will have bloom effect
    selectionLayer={10} // selection layer
    intensity={1.0} // The bloom intensity.
    blurPass={undefined} // A blur pass.
    width={Resizer.AUTO_SIZE} // render width
    height={Resizer.AUTO_SIZE} // render height
    kernelSize={KernelSize.LARGE} // blur kernel size
    luminanceThreshold={0.9} // luminance threshold. Raise this value to mask out darker elements in the scene.
    luminanceSmoothing={0.025} // smoothness of the luminance threshold. Range is [0, 1]
  /> */}
                    </EffectComposer>

                    <Suspense fallback={null}>
                        <Experience
                            joystickAngle={joystickAngle}
                        />
                        <Preload all />
                    </Suspense>
                </Canvas>
                <Loader />
            </KeyboardControls>
        </>
    );
};

export default App;
