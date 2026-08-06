import { useState, Suspense, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import Experience from './components/Experience.jsx';
import {
  AdaptiveDpr,
  Bvh,
  PerformanceMonitor,
  Preload,
  useProgress,
} from '@react-three/drei';
import gsap from 'gsap';
import { useStore } from './store/ZustandStorage.jsx';
import tunnel from 'tunnel-rat';
import { Howler } from 'howler';
import * as THREE from 'three';

import soundOnIcon from '/icons/sound-on.svg';
import soundOffIcon from '/icons/sound-off.svg';
import { EffectComposer } from './components/effectComposer/EffectComposer.jsx';

const MODELS_AMOUNT = 22;

/* Tunnel */
const ui = tunnel();

// Visibility Change
const visibilityChangeHandler = () =>
  Howler.mute(document.visibilityState === 'hidden');

// Animations
let hoverAnimation = undefined;

const App = () => {
  const sceneRevealerRef = useRef();
  const horizontalBlurPassRef = useRef();
  const verticalBlurPassRef = useRef();
  const soundOnIconRef = useRef();
  const soundOffIconRef = useRef();
  const startExperienceRef = useRef();

  const [dpr, setDpr] = useState(1.5);

  const { loaded } = useProgress();

  const initiateExperience = useCallback(() => {
    hoverAnimation?.kill();
    startExperienceRef.current.style.pointerEvents = 'none';

    useStore.setState({ experienceStarted: true });

    gsap.to(startExperienceRef.current.style, {
      opacity: 0,
      duration: 0.5,
      delay: 0,
    });

    gsap.to(sceneRevealerRef.current?.uniforms.get('progress'), {
      value: 1.5,
      duration: 5,
      ease: 'expo.isOut',
    });

    gsap.to(soundOnIconRef.current?.style, {
      opacity: 0.9,
      duration: 0.5,
      delay: 3,
    });
  }, []);

  useEffect(() => {
    document.addEventListener('visibilitychange', visibilityChangeHandler);

    return () => {
      removeEventListener('visibilitychange', visibilityChangeHandler);
    };
  }, []);

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
          soundOnIconRef.current.style.display = 'none';
          soundOffIconRef.current.style.display = 'block';
          Howler.mute(true);
        }}
      />
      <img
        ref={soundOffIconRef}
        src={soundOffIcon}
        style={{ display: 'none' }}
        className="volume-controller"
        alt="Sound down button"
        onClick={() => {
          soundOffIconRef.current.style.display = 'none';
          soundOnIconRef.current.style.display = 'block';
          Howler.mute(false);
        }}
      />
      <Canvas
        shadows={THREE.VSMShadowMap}
        dpr={dpr}
        performance={{ min: 0.5 }}
        camera={{
          position: [-3.5, 17.4, 29.6],
          rotation: [-Math.PI / 8, 0, 0],
          fov: 40,
          near: 0.5,
          far: 200,
        }}
        gl={{
          powerPreference: 'high-performance',
          antialias: true,
          toneMapping: THREE.LinearToneMapping,
        }}
      >
        <PerformanceMonitor
          onIncline={() => setDpr(2)}
          onDecline={() => setDpr(1)}
        />
        <AdaptiveDpr pixelated />
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
            <div
              ref={startExperienceRef}
              className="container"
              style={{ pointerEvents: 'auto' }}
            >
              <button
                className={'start-experience'}
                onClick={initiateExperience}
                onMouseEnter={() =>
                  (hoverAnimation = gsap.to(
                    sceneRevealerRef.current?.uniforms.get('progress'),
                    {
                      value: 0.35,
                      duration: 0.5,
                      ease: 'power2.out',
                    }
                  ))
                }
                onMouseLeave={() => hoverAnimation?.reverse()}
              >
                Enter
              </button>
            </div>
          </ui.In>
          <EffectComposer
            sceneRevealerRef={sceneRevealerRef}
            horizontalBlurPassRef={horizontalBlurPassRef}
            verticalBlurPassRef={verticalBlurPassRef}
          />

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
