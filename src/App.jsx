import { useState, Suspense, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber/webgpu';
import Experience from './components/Experience.jsx';
import { PerformanceMonitor, useProgress } from '@react-three/drei/webgpu';
import { Bvh } from '@react-three/drei/external';
import gsap from 'gsap';
import { useStore } from './store/ZustandStorage.jsx';
import tunnel from 'tunnel-rat';
import { Howler } from 'howler';
import * as THREE from 'three/webgpu';

import { IS_MOBILE_DEVICE, IS_PHOTO_MODE, MAX_DPR } from '#utils/utils.js';
import { DEBUG_ENABLED } from '#utils/debug.js';
import { prefersReducedMotion } from '#utils/reducedMotion.js';

import soundOnIcon from '/icons/sound-on.svg';
import soundOffIcon from '/icons/sound-off.svg';
import { EffectComposer } from './components/effectComposer/EffectComposer.jsx';
import { PrecompileScene } from './components/PrecompileScene.jsx';
import { AdaptiveDpr } from './components/AdaptiveDpr.jsx';

/* Tunnel */
const ui = tunnel();

// Mute = the user's sound toggle OR a hidden tab, so coming back to the tab
// never overrides a sound the user turned off
let userMuted = false;
const applyMute = () =>
  Howler.mute(userMuted || document.visibilityState === 'hidden');
const setUserMuted = muted => {
  userMuted = muted;
  applyMute();
};

// Animations
let hoverAnimation = undefined;

const App = () => {
  const sceneRevealerRef = useRef();
  const soundOnIconRef = useRef();
  const soundOffIconRef = useRef();
  const startExperienceRef = useRef();

  const [dpr, setDpr] = useState(MAX_DPR);

  // progress = loaded / total * 100, so new models never desync the loader
  const { progress } = useProgress();
  // The LoadingManager resets between batches, dropping progress back to 0
  // after 100 — clamp the displayed value to the highest reached
  const maxProgressRef = useRef(0);
  maxProgressRef.current = Math.max(maxProgressRef.current, progress);

  const initiateExperience = useCallback(() => {
    hoverAnimation?.kill();
    startExperienceRef.current.style.pointerEvents = 'none';

    useStore.setState({ experienceStarted: true });

    gsap.to(startExperienceRef.current.style, {
      opacity: 0,
      duration: 0.5,
      delay: 0,
    });

    gsap.to(sceneRevealerRef.current?.progress, {
      value: 1.5,
      // Reduced motion: quick reveal instead of the 5s sweep (the opacity
      // fades above are fine — reduced motion targets movement, not fades)
      duration: prefersReducedMotion() ? 1 : 5,
      ease: 'expo.out',
      // Kill the loading peek tween if it is still running on the same uniform
      overwrite: true,
    });

    gsap.to(soundOnIconRef.current?.style, {
      opacity: 0.9,
      duration: 0.5,
      delay: 3,
    });
  }, []);

  useEffect(() => {
    document.addEventListener('visibilitychange', applyMute);

    // Photo mode: no intro/sound UI is rendered, so start silently right away
    if (IS_PHOTO_MODE) {
      setUserMuted(true);
      useStore.setState({ experienceStarted: true });
    }

    return () => {
      document.removeEventListener('visibilitychange', applyMute);
    };
  }, []);

  return (
    <>
      <ui.Out />
      {!IS_PHOTO_MODE && (
      <>
      <img
        ref={soundOnIconRef}
        src={soundOnIcon}
        style={{ opacity: 0 }}
        className="volume-controller"
        alt="Sound on button"
        onClick={() => {
          soundOnIconRef.current.style.display = 'none';
          soundOffIconRef.current.style.display = 'block';
          setUserMuted(true);
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
          setUserMuted(false);
        }}
      />
      </>
      )}
      <Canvas
        dpr={dpr}
        performance={{ min: 0.5 }}
        camera={{
          position: [-3.5, 17.4, 29.6],
          rotation: [-Math.PI / 8, 0, 0],
          fov: 40,
          near: 0.5,
          far: 200,
        }}
        // WebGPU, falling back to its WebGL2 backend where WebGPU is missing.
        // Tone mapping is done in the post-processing graph
        renderer={{
          powerPreference: 'high-performance',
          antialias: false,
          toneMapping: THREE.NoToneMapping,
          shadows: IS_MOBILE_DEVICE ? false : 'variance',
          // GPU timing for the debug perf panel (timestamp queries)
          trackTimestamp: DEBUG_ENABLED && !IS_PHOTO_MODE,
        }}
        // R3F 10 canary leaves state.gl null under WebGPU (its getter is
        // flattened by the first store update), and drei 11 still reads it
        // (Clouds, useTexture...). Point it at the renderer once created.
        onCreated={({ set, renderer }) => set({ gl: renderer })}
      >
        <PerformanceMonitor
          onIncline={() => setDpr(MAX_DPR)}
          onDecline={() => setDpr(1)}
        />
        <AdaptiveDpr />
        <Suspense
          fallback={
            IS_PHOTO_MODE ? null : (
              <ui.In>
                <div className="container">
                  <p className="loader">{Math.ceil(maxProgressRef.current)}</p>
                </div>
              </ui.In>
            )
          }
        >
          {!IS_PHOTO_MODE && (
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
                    sceneRevealerRef.current?.progress,
                    {
                      value: 0.45,
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
          )}
          <EffectComposer sceneRevealerRef={sceneRevealerRef} />

          <Bvh firstHitOnly>
            <Experience />
          </Bvh>
          <PrecompileScene />
        </Suspense>
      </Canvas>
    </>
  );
};

export default App;
