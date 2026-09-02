uniform float uTime;
uniform float uSize;
// Shared sRGB screens atlas + the UV rect of the active project image
uniform sampler2D uTextureMap;
uniform vec2 uTextureOffset;
uniform vec2 uTextureSize;
uniform sampler2D uPerlinTexture;

// Idle pulse: the open disc radius breathes between the two amplitudes
uniform float uSizePulseSpeed;
uniform float uSizePulseMin;
uniform float uSizePulseMax;

// Disc edge (original projects portal look)
uniform float uNoiseScale;
uniform float uNoiseSpeed;
uniform float uDeformationStart;
uniform float uDeformationEnd;
uniform float uDeformationStrength;

// How much the noise flow field warps the project texture, relative to
// uDistortionStrength (1 = same amount). The texture never rotates, it
// only gets pushed around by the noise.
uniform float uTextureDistortion;

// Fake window-interior parallax: the project image reads as sitting
// uParallaxDepth (in UV units) behind the disc, sliding against the rim as
// the character/camera moves. The images are wider than tall on purpose:
// the disc shows a centered square crop (uTextureAspect = width / height)
// and the spare width absorbs the horizontal offset, so the parallax is
// horizontal only and needs no zoom inset.
uniform float uParallaxDepth;
uniform float uTextureAspect;

// Emissive energy ring hugging the deformed edge; intensities above the
// Bloom pass luminance threshold (2) make it glow
uniform vec3 uRimColor;
uniform float uRimIntensity;
uniform float uRimWidth;

// Final grade applied to the whole disc
uniform float uLighting;
uniform float uSaturation;

// Noise flow field pushing the project texture around
uniform float uDistortionScale;
uniform float uDistortionStrength;
uniform float uDistortionSpeed;

varying vec2 vUv;
varying vec3 vViewDirTangent;

float samplePerlinNoise(vec2 uv) {
  // perlin = green channel of the packed voronoi/perlin texture
  return texture2D(uPerlinTexture, uv).g;
}

void main() {
    // Disc with a noise-deformed edge; everything outside is discarded
    vec2 center = vec2(0.5);

    // Size pulse animation on top of the (animated) base size
    float size = uSize + mix(
      uSizePulseMin,
      uSizePulseMax,
      sin(uTime * uSizePulseSpeed) * 0.5 + 0.5
    );
    float baseRadius = size;

    float dist = length(vUv - center);

    float noise = texture2D(uPerlinTexture, vUv * uNoiseScale + uTime * uNoiseSpeed).g;

    float deformationStrength = smoothstep(uDeformationStart, uDeformationEnd, dist);
    float deformedRadius = baseRadius + (noise - 0.5) * uDeformationStrength * deformationStrength;

    if (dist > deformedRadius) {
        discard;
    }

    // Disc-normalized coordinates (edge = radius 1.0), so the flow field
    // grows with the opening
    vec2 portalPosition = (vUv - center) / max(size, 0.001);

    // Two-sample noise flow field deforming the project texture; the
    // center is kept more stable than the rim
    vec2 noiseUv = portalPosition * uDistortionScale * 0.42
      + vec2(uTime * uDistortionSpeed, -uTime * uDistortionSpeed * 0.73);
    float noiseX = samplePerlinNoise(noiseUv);
    float noiseY = samplePerlinNoise(noiseUv + vec2(17.31, 41.73));

    vec2 distortion = vec2(noiseX, noiseY) * 2.0 - 1.0;
    float centerStability = smoothstep(0.02, 0.55, length(portalPosition));

    // Fake interior parallax: intersect the view ray with a virtual plane
    // uParallaxDepth behind the disc, horizontal axis only. The z floor
    // keeps grazing angles from smearing the offset to infinity.
    vec3 parallaxViewDir = normalize(vViewDirTangent);
    float parallaxOffsetX = parallaxViewDir.x
      / max(abs(parallaxViewDir.z), 0.3)
      * uParallaxDepth;

    // Project texture: centered square crop of the wide image (dividing u
    // by the aspect keeps proportions), shifted by the parallax, then
    // deformed by the noise flow field
    vec2 textureUv = center
      + vec2(
          (vUv.x - center.x) / uTextureAspect + parallaxOffsetX,
          vUv.y - center.y
        )
      + distortion
        * uDistortionStrength
        * mix(0.3, 1.0, centerStability)
        * uTextureDistortion
        * max(size, 0.001);
    // Map into the atlas rect; the clamp replaces the old clamp-to-edge
    // wrapping so parallax/distortion can't bleed into neighboring tiles
    vec2 atlasUv = uTextureOffset
      + clamp(textureUv, vec2(0.001), vec2(0.999)) * uTextureSize;
    vec4 texColor = texture2D(uTextureMap, atlasUv);

    // Lighting and saturation grade on the final disc color
    texColor.rgb *= uLighting;
    float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    texColor.rgb = mix(vec3(luminance), texColor.rgb, uSaturation);
    // uSaturation > 1 extrapolates the mix — keep boosted colors from going
    // negative (bloom smears negative RGB into black squares)
    texColor.rgb = max(texColor.rgb, vec3(0.0));

    // Emissive rim added after the grade so its HDR color reaches the
    // Bloom pass untouched; flickers with the same noise as the edge
    float rim = smoothstep(deformedRadius - uRimWidth, deformedRadius, dist)
      * (0.55 + 0.9 * noise);
    texColor.rgb += uRimColor * rim * uRimIntensity;

    gl_FragColor = texColor;

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
