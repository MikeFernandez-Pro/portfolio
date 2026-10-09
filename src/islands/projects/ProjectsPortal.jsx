import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Circle } from '@react-three/drei/webgpu';
import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import { Howl } from 'howler';
import gsap from 'gsap';
import * as THREE from 'three/webgpu';
import {
  abs,
  cameraPosition,
  clamp,
  cos,
  Discard,
  dot,
  float,
  Fn,
  fract,
  If,
  length,
  max,
  mix,
  modelWorldMatrix,
  normalize,
  PI2,
  positionWorld,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';

import { useStore } from '#store';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';
import {
  PORTAL_LIGHT_DEFAULTS,
  portalLightSettings,
  portalLightUniforms,
} from '#islands/world/pointLights/islandPointLights.js';
import {
  createParticleSprite,
  particleAttribute,
  pointCoord,
} from '#utils/pointSprites.js';

import PortalAudio from '#assets/sounds/portal.mp3';

// Project images live in the shared sRGB screens atlas; they are wider than
// tall on purpose: the portal shows a centered square crop and the spare
// width feeds the horizontal parallax
import {
  useScreensAtlasTexture,
  useVoronoiPerlinTexture,
  SCREENS_ATLAS_RECTS,
} from '#utils/packedTextures.js';

// Atlas rect shown by each pressure plate
const PORTAL_PLATE_RECTS = {
  portalPlate: SCREENS_ATLAS_RECTS.santaClousFighting,
  seaPlate: SCREENS_ATLAS_RECTS.doanTenCon,
  halloweenPlate: SCREENS_ATLAS_RECTS.halloweenScene,
};

const PORTAL_POSITION = new THREE.Vector3(-16.12, 6.95, -37.7);
const PORTAL_OPEN_SIZE = 0.36;

// Current visuals, tweakable from the 'ProjectsPortal' debug folder
const PORTAL_SHADER_DEFAULTS = {
  noiseScale: 1.14,
  noiseSpeed: 0.05,
  deformationStart: 0.3,
  deformationEnd: 0.41,
  deformationStrength: 0.18,
  textureDistortion: 0.42,
  // Fake window-interior parallax on the project image, driven by the
  // camera (which follows the character): depth of the virtual image plane
  // behind the disc. The offset is horizontal only — the images' extra
  // width is the slide margin, so no zoom inset is needed
  parallaxDepth: 0.4,
  // Emissive edge ring; intensity > 2 crosses the Bloom threshold
  rimColor: '#ffffff',
  rimIntensity: 3.7,
  rimWidth: 0.02,
  lighting: 1,
  saturation: 1.16,
  sizePulseSpeed: 2.39,
  sizePulseMin: 0.063,
  sizePulseMax: 0.1,
  // Noise flow field that pushes the project texture around
  distortionScale: 0.78,
  distortionStrength: 0.382,
  distortionSpeed: 0.033,
};

// Sparks spiralling into the open portal, as if it were sucking in reality
const SPARKS_DEFAULTS = {
  count: 80,
  color: '#00a3ff',
  intensity: 20,
  size: 0.043,
  speed: 0.12,
  spawnRadius: 1.3,
  swirlTurns: 0.35,
  frontOffset: 0.9,
};

// Buffers are allocated at the max once; the live count control only
// changes how many sprite instances are drawn
const SPARKS_COUNT = 200;
const sparksSizes = new Float32Array(SPARKS_COUNT);
const sparksAngles = new Float32Array(SPARKS_COUNT);
const sparksSpeeds = new Float32Array(SPARKS_COUNT);
const sparksPhases = new Float32Array(SPARKS_COUNT);

for (let i = 0; i < SPARKS_COUNT; i++) {
  sparksSizes[i] = Math.random() * 0.6 + 0.4;
  sparksAngles[i] = Math.random() * Math.PI * 2;
  sparksSpeeds[i] = Math.random() * 0.8 + 0.6;
  sparksPhases[i] = Math.random();
}

// Project disc: noise-deformed edge, fake window-interior parallax on the
// project image (from the shared sRGB screens atlas), a noise flow field
// pushing the image around, a lighting/saturation grade and an emissive rim
const createPortalMaterial = (u, screensAtlasTexture, perlinTexture) => {
  const material = new THREE.MeshBasicNodeMaterial({ transparent: true });
  const perlin = coords => texture(perlinTexture, coords).g;

  material.colorNode = Fn(() => {
    const vUv = uv();
    const center = vec2(0.5);

    // Size pulse animation on top of the (animated) base size
    const size = u.uSize
      .add(
        mix(
          u.uSizePulseMin,
          u.uSizePulseMax,
          sin(time.mul(u.uSizePulseSpeed)).mul(0.5).add(0.5)
        )
      )
      .toVar();

    const dist = length(vUv.sub(center)).toVar();

    // Disc with a noise-deformed edge; everything outside is discarded
    const noise = perlin(
      vUv.mul(u.uNoiseScale).add(time.mul(u.uNoiseSpeed))
    ).toVar();
    const deformationStrength = smoothstep(
      u.uDeformationStart,
      u.uDeformationEnd,
      dist
    );
    const deformedRadius = size
      .add(noise.sub(0.5).mul(u.uDeformationStrength).mul(deformationStrength))
      .toVar();
    If(dist.greaterThan(deformedRadius), () => {
      Discard();
    });

    // Disc-normalized coordinates (edge = radius 1.0), so the flow field
    // grows with the opening
    const portalPosition = vUv.sub(center).div(max(size, 0.001));

    // Two-sample noise flow field deforming the project texture; the center
    // is kept more stable than the rim
    const noiseUv = portalPosition
      .mul(u.uDistortionScale)
      .mul(0.42)
      .add(
        vec2(
          time.mul(u.uDistortionSpeed),
          time.mul(u.uDistortionSpeed).mul(-0.73)
        )
      )
      .toVar();
    const distortion = vec2(
      perlin(noiseUv),
      perlin(noiseUv.add(vec2(17.31, 41.73)))
    )
      .mul(2)
      .sub(1);
    const centerStability = smoothstep(0.02, 0.55, length(portalPosition));

    // Fake interior parallax: intersect the view ray with a virtual plane
    // uParallaxDepth behind the disc, horizontal axis only. Tangent basis
    // straight from the model matrix (the disc faces +Z, u along +X). The z
    // floor keeps grazing angles from smearing the offset to infinity
    const viewDir = positionWorld.sub(cameraPosition);
    const viewDirTangent = normalize(
      vec3(
        dot(viewDir, normalize(modelWorldMatrix.element(0).xyz)),
        dot(viewDir, normalize(modelWorldMatrix.element(1).xyz)),
        dot(viewDir, normalize(modelWorldMatrix.element(2).xyz))
      )
    ).toVar();
    const parallaxOffsetX = viewDirTangent.x
      .div(max(abs(viewDirTangent.z), 0.3))
      .mul(u.uParallaxDepth);

    // Centered square crop of the wide image (u divided by the aspect),
    // shifted by the parallax, deformed by the flow field
    const textureUv = center
      .add(
        vec2(
          vUv.x.sub(0.5).div(u.uTextureAspect).add(parallaxOffsetX),
          vUv.y.sub(0.5)
        )
      )
      .add(
        distortion
          .mul(u.uDistortionStrength)
          .mul(mix(0.3, 1, centerStability))
          .mul(u.uTextureDistortion)
          .mul(max(size, 0.001))
      );
    // Map into the atlas rect; the clamp stops parallax/distortion from
    // bleeding into neighboring tiles
    const atlasUv = u.uTextureOffset.add(
      clamp(textureUv, vec2(0.001), vec2(0.999)).mul(u.uTextureSize)
    );
    const texColor = texture(screensAtlasTexture, atlasUv).toVar();

    // Lighting and saturation grade. uSaturation > 1 extrapolates the mix —
    // keep boosted colors from going negative (bloom smears negative RGB
    // into black squares)
    const lit = texColor.rgb.mul(u.uLighting);
    const luminance = dot(lit, vec3(0.299, 0.587, 0.114));
    const graded = max(mix(vec3(luminance), lit, u.uSaturation), vec3(0));

    // Emissive rim added after the grade so its HDR color reaches the bloom
    // untouched; flickers with the same noise as the edge
    const rim = smoothstep(
      deformedRadius.sub(u.uRimWidth),
      deformedRadius,
      dist
    ).mul(noise.mul(0.9).add(0.55));

    return vec4(
      graded.add(u.uRimColor.mul(rim).mul(u.uRimIntensity)),
      texColor.a
    );
  })();

  return material;
};

// Sparks spiralling into the open portal: each loops on its own phase,
// spawning on a wide ring in front of the portal and diving into the disc
const createPortalSparksMaterial = u => {
  const material = new THREE.PointsNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const aSize = particleAttribute(sparksSizes, 1);
  const aAngle = particleAttribute(sparksAngles, 1);
  const aSpeed = particleAttribute(sparksSpeeds, 1);
  const aPhase = particleAttribute(sparksPhases, 1);

  const t = fract(time.mul(u.uSpeed).mul(aSpeed).add(aPhase));
  const ease = t.mul(t).mul(float(3).sub(t.mul(2)));

  const radius = mix(u.uSpawnRadius, 0.06, ease).mul(u.uOpenFactor);
  const angle = aAngle.add(t.mul(u.uSwirlTurns).mul(PI2));
  material.positionNode = vec3(
    cos(angle).mul(radius),
    sin(angle).mul(radius),
    u.uFrontOffset.mul(ease.oneMinus())
  );

  // Sparks shrink as they get sucked in (gl_PointSize * uResolution.y / -viewZ)
  material.sizeNode = u.uSize
    .mul(aSize)
    .mul(mix(1, 0.4, ease))
    .mul(2);

  // Fade in on spawn, vanish right before reaching the disc; hidden
  // entirely while the portal is closed. Firefly-style glow falloff (alpha 0
  // outside it)
  const life = smoothstep(0, 0.2, t)
    .mul(smoothstep(0.75, 1, t).oneMinus())
    .mul(u.uOpenFactor);
  const glow = max(length(pointCoord.sub(0.5)), 0.001)
    .reciprocal()
    .mul(0.05)
    .sub(0.1)
    .clamp(0, 1);
  material.colorNode = vec4(u.uColor.mul(u.uIntensity), glow.mul(max(life, 0)));

  return material;
};

const ProjectsPortal = props => {
  const { island } = props;

  const portal = island.nodes.portal;

  const portalSoundEffect = useMemo(
    () =>
      new Howl({
        src: [PortalAudio],
        autoplay: false,
        loop: true,
        volume: 0,
      }),
    [PortalAudio]
  );

  // Textures
  const screensAtlasTexture = useScreensAtlasTexture();

  const perlinTexture = useVoronoiPerlinTexture();

  // Materials. TSL uniform nodes: the open animation, the plate
  // subscription and the controls write their .value
  const { portalMaterial, portalUniforms } = useMemo(() => {
    const d = PORTAL_SHADER_DEFAULTS;
    const portalUniforms = {
      uSize: uniform(-0.2),
      // Atlas rect of the active project image; set by the activePlate
      // subscription before the portal ever opens
      uTextureOffset: uniform(new THREE.Vector2(0, 0)),
      uTextureSize: uniform(new THREE.Vector2(1, 1)),
      uSizePulseSpeed: uniform(d.sizePulseSpeed),
      uSizePulseMin: uniform(d.sizePulseMin),
      uSizePulseMax: uniform(d.sizePulseMax),
      uNoiseScale: uniform(d.noiseScale),
      uNoiseSpeed: uniform(d.noiseSpeed),
      uDeformationStart: uniform(d.deformationStart),
      uDeformationEnd: uniform(d.deformationEnd),
      uDeformationStrength: uniform(d.deformationStrength),
      uTextureDistortion: uniform(d.textureDistortion),
      uParallaxDepth: uniform(d.parallaxDepth),
      uTextureAspect: uniform(1),
      uRimColor: uniform(new THREE.Color(d.rimColor)),
      uRimIntensity: uniform(d.rimIntensity),
      uRimWidth: uniform(d.rimWidth),
      uLighting: uniform(d.lighting),
      uSaturation: uniform(d.saturation),
      uDistortionScale: uniform(d.distortionScale),
      uDistortionStrength: uniform(d.distortionStrength),
      uDistortionSpeed: uniform(d.distortionSpeed),
    };
    const portalMaterial = createPortalMaterial(
      portalUniforms,
      screensAtlasTexture,
      perlinTexture
    );
    return { portalMaterial, portalUniforms };
  }, [perlinTexture, screensAtlasTexture]);

  useEffect(() => () => portalMaterial.dispose(), [portalMaterial]);

  const { sparks, sparksUniforms } = useMemo(() => {
    const sparksUniforms = {
      uOpenFactor: uniform(0),
      uSize: uniform(SPARKS_DEFAULTS.size),
      uColor: uniform(new THREE.Color(SPARKS_DEFAULTS.color)),
      uIntensity: uniform(SPARKS_DEFAULTS.intensity),
      uSpawnRadius: uniform(SPARKS_DEFAULTS.spawnRadius),
      uSwirlTurns: uniform(SPARKS_DEFAULTS.swirlTurns),
      uFrontOffset: uniform(SPARKS_DEFAULTS.frontOffset),
      uSpeed: uniform(SPARKS_DEFAULTS.speed),
    };
    const sparks = createParticleSprite(
      createPortalSparksMaterial(sparksUniforms),
      SPARKS_DEFAULTS.count
    );
    sparks.position.copy(PORTAL_POSITION);
    return { sparks, sparksUniforms };
  }, []);

  useEffect(() => () => sparks.material.dispose(), [sparks]);

  // Target radius of the open portal; the scale-up animation reads it live
  const openSizeRef = useRef(PORTAL_OPEN_SIZE);

  const portalControl = uniformControls(portalUniforms);

  const d = PORTAL_SHADER_DEFAULTS;

  useControls('ProjectsPortal', {
    size: {
      value: PORTAL_OPEN_SIZE,
      min: 0,
      max: 0.71,
      step: 0.005,
      onChange: value => {
        openSizeRef.current = value;
        // Resize live only once a portal has been opened, otherwise the
        // circle would show up without any project texture
        if (useStore.getState().activePlate) {
          portalUniforms.uSize.value = value;
        }
      },
    },
    sizePulseSpeed: portalControl(
      'uSizePulseSpeed',
      d.sizePulseSpeed,
      0,
      10,
      0.01
    ),
    sizePulseMin: portalControl(
      'uSizePulseMin',
      d.sizePulseMin,
      -0.1,
      0.1,
      0.001
    ),
    sizePulseMax: portalControl(
      'uSizePulseMax',
      d.sizePulseMax,
      -0.1,
      0.1,
      0.001
    ),
    noiseScale: portalControl('uNoiseScale', d.noiseScale, 0, 5, 0.01),
    noiseSpeed: portalControl('uNoiseSpeed', d.noiseSpeed, 0, 0.5, 0.001),
    deformationStart: portalControl(
      'uDeformationStart',
      d.deformationStart,
      0,
      0.7,
      0.005
    ),
    deformationEnd: portalControl(
      'uDeformationEnd',
      d.deformationEnd,
      0,
      0.7,
      0.005
    ),
    deformationStrength: portalControl(
      'uDeformationStrength',
      d.deformationStrength,
      0,
      1,
      0.005
    ),
    textureDistortion: portalControl(
      'uTextureDistortion',
      d.textureDistortion,
      0,
      3,
      0.01
    ),
    parallaxDepth: portalControl(
      'uParallaxDepth',
      d.parallaxDepth,
      0,
      0.5,
      0.005
    ),
    rimColor: portalControl('uRimColor', d.rimColor),
    rimIntensity: portalControl('uRimIntensity', d.rimIntensity, 0, 20, 0.1),
    rimWidth: portalControl('uRimWidth', d.rimWidth, 0, 0.2, 0.001),
    lighting: portalControl('uLighting', d.lighting, 0, 3, 0.01),
    saturation: portalControl('uSaturation', d.saturation, 0, 2, 0.01),
    distortionScale: portalControl(
      'uDistortionScale',
      d.distortionScale,
      0,
      3,
      0.01
    ),
    distortionStrength: portalControl(
      'uDistortionStrength',
      d.distortionStrength,
      0,
      0.5,
      0.001
    ),
    distortionSpeed: portalControl(
      'uDistortionSpeed',
      d.distortionSpeed,
      0,
      0.5,
      0.001
    ),
  });

  const sparksControl = uniformControls(sparksUniforms);

  const portalDiscRef = useRef(null);

  useControls('PortalSparks', {
    count: {
      value: SPARKS_DEFAULTS.count,
      min: 0,
      max: SPARKS_COUNT,
      step: 1,
      onChange: v => {
        sparks.count = v;
      },
    },
    color: sparksControl('uColor', SPARKS_DEFAULTS.color),
    intensity: sparksControl(
      'uIntensity',
      SPARKS_DEFAULTS.intensity,
      0,
      20,
      0.1
    ),
    size: sparksControl('uSize', SPARKS_DEFAULTS.size, 0, 0.3, 0.001),
    speed: sparksControl('uSpeed', SPARKS_DEFAULTS.speed, 0, 1, 0.005),
    spawnRadius: sparksControl(
      'uSpawnRadius',
      SPARKS_DEFAULTS.spawnRadius,
      0,
      3,
      0.01
    ),
    swirlTurns: sparksControl(
      'uSwirlTurns',
      SPARKS_DEFAULTS.swirlTurns,
      -2,
      2,
      0.01
    ),
    frontOffset: sparksControl(
      'uFrontOffset',
      SPARKS_DEFAULTS.frontOffset,
      0,
      3,
      0.01
    ),
  });

  const portalLightControl = uniformControls(portalLightUniforms);
  useControls('PortalLight', {
    color: portalLightControl('uPortalLightColor', PORTAL_LIGHT_DEFAULTS.color),
    intensity: {
      value: PORTAL_LIGHT_DEFAULTS.intensity,
      min: 0,
      max: 10,
      step: 0.05,
      onChange: v => {
        portalLightSettings.intensity = v;
      },
    },
    decay: portalLightControl(
      'uPortalLightDecay',
      PORTAL_LIGHT_DEFAULTS.decay,
      0,
      1,
      0.005
    ),
    decayPower: portalLightControl(
      'uPortalLightDecayPower',
      PORTAL_LIGHT_DEFAULTS.decayPower,
      0.1,
      8,
      0.05
    ),
    specularPower: portalLightControl(
      'uPortalLightSpecularPower',
      PORTAL_LIGHT_DEFAULTS.specularPower,
      1,
      64,
      1
    ),
  });

  // Animation

  useEffect(() => {
    // Every portal visual (GLB swirl mesh, shader disc, sparks) stays hidden
    // until the first plate press; the store remembers the pressed plate, so
    // a remount keeps an already-opened portal visible
    const applyPortalVisibility = visible => {
      portal.visible = visible;
      if (portalDiscRef.current) portalDiscRef.current.visible = visible;
      sparks.visible = visible;
    };
    applyPortalVisibility(Boolean(useStore.getState().activePlate));

    // Animate a progress value and scale by the (tweakable) open size, so
    // the animation target doesn't get baked in at creation time
    const openProgress = { value: 0 };
    const portalScaleUpAnimation = gsap.fromTo(
      openProgress,
      { value: 0 },
      {
        value: 1,
        duration: 0.3,
        paused: true,
        ease: 'power2.out',
        onUpdate: () => {
          portalUniforms.uSize.value = openProgress.value * openSizeRef.current;
        },
      }
    );

    // Retrieve current activated plate and point the shader at its atlas rect
    const unsubActivaPlate = useStore.subscribe(
      state => state.activePlate,
      activePlate => {
        if (activePlate) {
          applyPortalVisibility(true);
          const rect = PORTAL_PLATE_RECTS[activePlate];
          portalUniforms.uTextureOffset.value.copy(rect.offset);
          portalUniforms.uTextureSize.value.copy(rect.size);
          portalUniforms.uTextureAspect.value = rect.aspect;
          portalScaleUpAnimation.restart();
          portalSoundEffect.play();
        }
      }
    );

    // Update portal sound effect volume based on character position
    const unsubCharacterPosition = useStore.subscribe(
      state => state.characterPosition,
      characterPosition => {
        if (characterPosition) {
          portalSoundEffect.volume(
            PORTAL_POSITION.distanceTo(characterPosition) < 13
              ? Math.min(
                  (1 / PORTAL_POSITION.distanceTo(characterPosition)) * 2,
                  0.8
                ) * SOUND_VOLUMES.portal
              : 0
          );
        }
      }
    );

    // Remove subscriptions on unmount
    return () => {
      unsubActivaPlate();
      unsubCharacterPosition();
      portalScaleUpAnimation?.kill();
    };
  }, [portalUniforms, sparks, portalSoundEffect]);

  useFrame((state, delta) => {
    // Hidden until the first plate press (the activePlate subscription flips
    // the visibility): skip the rotation and the whole uniform feed. The
    // portal light is initialized off, so it waits too.
    if (!portal.visible) return;

    portal.rotation.y += delta * 0.15;

    // Sparks grow in with the very first portal opening, then the ratchet
    // keeps them at full strength: re-pressing a plate replays the disc
    // scale-up but must not make the sparks vanish and reappear
    const openFactor = Math.max(
      sparksUniforms.uOpenFactor.value,
      THREE.MathUtils.clamp(
        portalUniforms.uSize.value / openSizeRef.current,
        0,
        1
      )
    );

    sparksUniforms.uOpenFactor.value = openFactor;
    // The island point light follows the same ratchet: off until the first
    // opening, full strength forever after
    portalLightUniforms.uPortalLightIntensity.value =
      portalLightSettings.intensity * openFactor;
  });

  return (
    <>
      <Circle
        ref={portalDiscRef}
        args={[0.8, 32]}
        material={portalMaterial}
        position={[-16.12, 6.95, -37.7]}
      />
      <primitive object={sparks} />
    </>
  );
};

export { ProjectsPortal };
