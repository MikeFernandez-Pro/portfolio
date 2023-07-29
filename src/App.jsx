import { useState, Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import Experience from "./Experience.jsx";
import { KeyboardControls, Loader, Preload } from "@react-three/drei";
import { Leva } from "leva";
import { Joystick } from "react-joystick-component";
import { Bloom, BrightnessContrast  , DepthOfField, EffectComposer, Noise, Vignette, SSAO } from '@react-three/postprocessing'
import * as THREE from "three"

const App = (props) => {
    const [joystickAngle, setJoystickAngle] = useState(0);
    const [mousePressed, setMousePressed] = useState(false);

    //renderer.shadowMap.type = THREE.PCFSoftShadowMapqa
    return (
        <>
            <Joystick
                size={100}
                sticky={false}
                baseColor="hsla(232, 7%, 20%, 0.5)"
                stickColor="hsla(232, 7%, 20%, 1)"
                move={(e) => {
                    setJoystickAngle(Math.atan2(e.y, e.x));
                }}
                stop={() => setJoystickAngle(0)}
            ></Joystick>
            <Leva collapsed={false} />
            <KeyboardControls
                map={[
                    { name: "forward", keys: ["ArrowUp", "KeyW"] },
                    { name: "backward", keys: ["ArrowDown", "KeyS"] },
                    { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
                    { name: "rightward", keys: ["ArrowRight", "KeyD"] },
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
                    onMouseDown={() => setMousePressed(true)}
                    onMouseUp={() => setMousePressed(false)}
                >
                    <EffectComposer disableNormalPass>
                        <Bloom mipmapBlur luminanceThreshold={1}  luminanceSmoothing={1} intensity={2}/>
                        {/* <DepthOfField
    focusDistance={0} // where to focus
    focalLength={0.15} // focal length
    bokehScale={2} // bokeh size
  /> */}
                    </EffectComposer>
                    <Suspense fallback={null}>
                        <Experience
                            joystickAngle={joystickAngle}
                            mousePressed={mousePressed}
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
