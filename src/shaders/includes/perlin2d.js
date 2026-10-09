//	Classic Perlin 2D Noise
//	by Stefan Gustavson
//
// TSL port of perlin2d.glsl
import { Fn, abs, dot, float, floor, fract, mix, mod, vec2, vec4 } from 'three/tsl';

const permute = x => mod(x.mul(34).add(1).mul(x), 289);
const fade = t => t.mul(t).mul(t).mul(t.mul(t.mul(6).sub(15)).add(10));

export const perlin2d = /*@__PURE__*/ Fn(([P]) => {
  const Pi = mod(floor(P.xyxy).add(vec4(0, 0, 1, 1)), 289); // avoid truncation effects in permutation
  const Pf = fract(P.xyxy).sub(vec4(0, 0, 1, 1));
  const ix = Pi.xzxz;
  const iy = Pi.yyww;
  const fx = Pf.xzxz;
  const fy = Pf.yyww;
  const i = permute(permute(ix).add(iy));
  const gx = fract(i.mul(0.0243902439)).mul(2).sub(1).toVar(); // 1/41 = 0.024...
  const gy = abs(gx).sub(0.5);
  const tx = floor(gx.add(0.5));
  gx.assign(gx.sub(tx));
  const g00 = vec2(gx.x, gy.x).toVar();
  const g10 = vec2(gx.y, gy.y).toVar();
  const g01 = vec2(gx.z, gy.z).toVar();
  const g11 = vec2(gx.w, gy.w).toVar();
  const norm = float(1.79284291400159).sub(
    vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11)).mul(
      0.85373472095314
    )
  );
  g00.mulAssign(norm.x);
  g01.mulAssign(norm.y);
  g10.mulAssign(norm.z);
  g11.mulAssign(norm.w);
  const n00 = dot(g00, vec2(fx.x, fy.x));
  const n10 = dot(g10, vec2(fx.y, fy.y));
  const n01 = dot(g01, vec2(fx.z, fy.z));
  const n11 = dot(g11, vec2(fx.w, fy.w));
  const fadeXy = fade(Pf.xy);
  const nX = mix(vec2(n00, n01), vec2(n10, n11), fadeXy.x);
  const nXy = mix(nX.x, nX.y, fadeXy.y);
  return nXy.mul(2.3);
}).setLayout({
  name: 'perlin2d',
  type: 'float',
  inputs: [{ name: 'P', type: 'vec2' }],
});
