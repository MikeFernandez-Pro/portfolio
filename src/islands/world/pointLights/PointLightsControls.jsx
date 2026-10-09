import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import { DEBUG_ENABLED } from '#debug/debugEnabled.js';

import { pointLights } from './pointLights.js';
import { pointLightControls, positionControl } from './pointLightControls.js';

// Debug marker at a point light's position: a small unlit sphere in the
// light color plus an axes cross, copying the position uniform every frame so
// the position control moves it live. Debug only (DEBUG_ENABLED gate at the
// call site), never mounted in production.
const LightPositionHelper = ({ light }) => {
  const groupRef = useRef();

  useFrame(() => {
    groupRef.current?.position.copy(light.position.value);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.08, 12, 8]} />
        <meshBasicMaterial color={light.color.value} toneMapped={false} />
      </mesh>
      <axesHelper args={[0.5]} />
    </group>
  );
};

// Debug folders for the point lights (the projects portal, skills glyph and
// character lantern folders live next to their animations)
const PointLightsControls = () => {
  const {
    torch,
    lantern,
    houseLantern,
    candle,
    indicator,
    cauldron,
    spawn,
    plate,
    forgeLava,
    sword,
    well,
    window: houseWindow,
  } = pointLights;

  useControls('TorchLights', pointLightControls(torch));

  useControls('LanternLights', pointLightControls(lantern));

  // showHelper marks the position while tuning it
  const { showHelper: showHouseLanternHelper } = useControls(
    'HouseLanternLight',
    {
      showHelper: false,
      ...pointLightControls(houseLantern),
      position: positionControl(houseLantern, houseLantern.defaults.position),
    }
  );

  useControls('CandlesLight', pointLightControls(candle));

  useControls('IndicatorLights', pointLightControls(indicator));

  useControls('CauldronLight', {
    ...pointLightControls(cauldron),
    height: {
      value: cauldron.defaults.height,
      min: -1,
      max: 5,
      step: 0.01,
      onChange: v => {
        cauldron.position.value.y = cauldron.defaults.position[1] + v;
      },
    },
  });

  useControls(
    'SpawnLight',
    pointLightControls(spawn, {
      // The uniform is driven by the respawn timeline (0 at rest); the
      // control only sets the peak intensity the fade rises to
      intensity: {
        value: spawn.defaults.intensity,
        min: 0,
        max: 15,
        step: 0.05,
        onChange: v => {
          spawn.settings.intensity = v;
        },
      },
      height: {
        value: spawn.defaults.height,
        min: -2,
        max: 5,
        step: 0.01,
        onChange: v => {
          spawn.position.value.y = spawn.defaults.position[1] + v;
        },
      },
    })
  );

  // Per-plate on/off is driven by the press ramps in ProjectPlates
  // (factors); these controls set the shared look
  useControls('PlatesLight', {
    ...pointLightControls(plate),
    height: uniformControls(plate)(
      'height',
      plate.defaults.height,
      -1,
      5,
      0.01
    ),
  });

  // The intensity uniform is driven every frame by the bellows gasp in
  // ForgeLavaPlane, sweeping minIntensity..maxIntensity — drop the base
  // intensity control in favor of the range below
  const forgeLavaLook = pointLightControls(forgeLava);
  delete forgeLavaLook.intensity;

  // showHelper has no onChange so it comes back as state and re-renders the
  // marker below; the position input (x/y/z fields) moves it live
  const { showHelper: showForgeLavaHelper } = useControls('ForgeLavaLight', {
    showHelper: false,
    ...forgeLavaLook,
    // Resting intensity (bellows open)
    minIntensity: {
      value: forgeLava.defaults.minIntensity,
      min: 0,
      max: 100,
      step: 0.05,
      onChange: v => {
        forgeLava.settings.minIntensity = v;
      },
    },
    // Gasp peak intensity (bellows fully closed)
    maxIntensity: {
      value: forgeLava.defaults.maxIntensity,
      min: 0,
      max: 100,
      step: 0.05,
      onChange: v => {
        forgeLava.settings.maxIntensity = v;
      },
    },
    position: positionControl(forgeLava, forgeLava.defaults.position),
  });

  useControls('SwordLight', {
    ...pointLightControls(sword),
    position: positionControl(sword, sword.defaults.position),
  });

  useControls('WellLight', {
    ...pointLightControls(well),
    position: positionControl(well, well.defaults.position),
  });

  useControls('WindowLight', {
    ...pointLightControls(houseWindow),
    position: positionControl(houseWindow, houseWindow.defaults.position),
  });

  return (
    <>
      {DEBUG_ENABLED && showForgeLavaHelper && (
        <LightPositionHelper light={forgeLava} />
      )}
      {DEBUG_ENABLED && showHouseLanternHelper && (
        <LightPositionHelper light={houseLantern} />
      )}
    </>
  );
};

export { PointLightsControls };
