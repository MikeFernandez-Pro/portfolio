import { useState, Suspense, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber/webgpu';
import Experience from './Experience.jsx';
import { useProgress } from '@react-three/drei/webgpu';
import gsap from 'gsap';
import { useStore } from '#store';
import tunnel from 'tunnel-rat';
import { Howler } from 'howler';
import * as THREE from 'three/webgpu';

import { DEBUG_ENABLED } from '#debug/debugEnabled.js';
import { IS_MOBILE_DEVICE } from '#utils/device.js';
import { prefersReducedMotion } from '#utils/reducedMotion.js';
import { CAMERA_INITIAL_OFFSET } from '#character/hooks/useThirdPersonCamera.js';
import Joystick from '#character/Joystick.jsx';

import soundOnIcon from '/icons/sound-on.svg';
import soundOffIcon from '/icons/sound-off.svg';
import {
  PostProcessing,
  START_DPR,
} from '#postprocessing/PostProcessing.jsx';
import { PrecompileScene } from './PrecompileScene.jsx';

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

// Sound on/off icons. Own state, so a toggle doesn't re-render the scene;
// the on icon starts transparent and App fades it in on Enter
const SoundToggle = ({ onIconRef }) => {
  const [muted, setMuted] = useState(false);
  const toggle = () => {
    setUserMuted(!muted);
    setMuted(!muted);
  };

  return (
    <>
      <img
        ref={onIconRef}
        src={soundOnIcon}
        style={{ opacity: 0, display: muted ? 'none' : 'block' }}
        className="volume-controller"
        alt="Sound on button"
        onClick={toggle}
      />
      <img
        src={soundOffIcon}
        style={{ display: muted ? 'block' : 'none' }}
        className="volume-controller"
        alt="Sound off button"
        onClick={toggle}
      />
    </>
  );
};

// Animations
let hoverAnimation = undefined;

const App = () => {
  const irisRef = useRef();
  const soundOnIconRef = useRef();
  const startExperienceRef = useRef();

  const [dpr, setDpr] = useState(START_DPR);

  // The Enter button waits for the shader precompile (PrecompileScene)
  const sceneReady = useStore(state => state.sceneReady);

  // progress = loaded / total * 100, so new models never desync the loader
  const { progress } = useProgress();
  // The LoadingManager resets between batches, dropping progress back to 0
  // after 100 — clamp the displayed value to the highest reached
  const maxProgressRef = useRef(0);
  maxProgressRef.current = Math.max(maxProgressRef.current, progress);

  // Debug: when the loader reaches 100% (PrecompileScene logs when the
  // scene's warm-up starts, both in ms since page load)
  const loadedLoggedRef = useRef(false);
  if (DEBUG_ENABLED && progress === 100 && !loadedLoggedRef.current) {
    loadedLoggedRef.current = true;
    console.info(`Loader 100% at ${performance.now().toFixed(0)} ms`);
  }

  const initiateExperience = useCallback(() => {
    hoverAnimation?.kill();
    startExperienceRef.current.style.pointerEvents = 'none';

    // Locked in the same update, so no listener sees a started, unlocked
    // experience before the intro pan (useThirdPersonCamera) unlocks it
    useStore.setState({
      experienceStarted: true,
      introControlsLocked: !prefersReducedMotion(),
    });

    gsap.to(startExperienceRef.current.style, {
      opacity: 0,
      duration: 0.5,
    });

    gsap.to(irisRef.current?.progress, {
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

    return () => {
      document.removeEventListener('visibilitychange', applyMute);
    };
  }, []);

  // Shown while the assets load, then while the shaders precompile
  const loader = (
    <ui.In>
      <div className="container">
        <p className="loader">{Math.ceil(maxProgressRef.current)}</p>
      </div>
    </ui.In>
  );

  return (
    <>
      <ui.Out />
      <SoundToggle onIconRef={soundOnIconRef} />
      {IS_MOBILE_DEVICE && <Joystick />}
      <Canvas
        dpr={dpr}
        camera={{
          position: [
            CAMERA_INITIAL_OFFSET.x,
            CAMERA_INITIAL_OFFSET.y,
            CAMERA_INITIAL_OFFSET.z,
          ],
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
          shadows: IS_MOBILE_DEVICE ? false : 'percentage',
        }}
        // R3F 10 canary leaves state.gl null under WebGPU (its getter is
        // flattened by the first store update), and drei 11 still reads it
        // (Clouds, useTexture...). Point it at the renderer once created.
        // Debug: name the active backend, to spot a silent WebGL2 fallback
        // (phones without a secure context)
        onCreated={({ set, renderer }) => {
          set({ gl: renderer });
          if (DEBUG_ENABLED) {
            console.info(
              `Renderer backend: ${renderer.backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL 2'}`
            );
          }
        }}
      >
        <Suspense fallback={loader}>
          {!sceneReady && loader}
          {sceneReady && (
            <ui.In>
              <div
                ref={startExperienceRef}
                className="container"
                style={{ pointerEvents: 'auto' }}
              >
                <button
                  className={'start-experience'}
                  onClick={initiateExperience}
                  onMouseEnter={() => {
                    // One hover tween at a time: a quick leave/enter would
                    // otherwise stack a new tween on the reversing one
                    hoverAnimation?.kill();
                    hoverAnimation = gsap.to(irisRef.current?.progress, {
                      value: 0.45,
                      duration: 0.5,
                      ease: 'power2.out',
                    });
                  }}
                  onMouseLeave={() => hoverAnimation?.reverse()}
                >
                  Enter
                </button>
              </div>
            </ui.In>
          )}
          <PostProcessing irisRef={irisRef} setDpr={setDpr} />

          <Experience />
          <PrecompileScene />
        </Suspense>
      </Canvas>
    </>
  );
};

export default App;
