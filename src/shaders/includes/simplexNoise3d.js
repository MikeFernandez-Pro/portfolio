//	Simplex 3D Noise
//	by Ian McEwan, Ashima Arts
//
// Written without assign(): a TSL expression
// that isn't a var is re-evaluated where it is used, so mutating a variable it
// depends on (GLSL's `i = mod(i, 289.0)`) would change it after the fact.
// mod() keeps GLSL's floor semantics on the WGSL backend too.
import {
  Fn,
  abs,
  dot,
  floor,
  float,
  max,
  min,
  mod,
  step,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';

const permute = x => mod(x.mul(34).add(1).mul(x), 289);
const taylorInvSqrt = r => float(1.79284291400159).sub(r.mul(0.85373472095314));

export const snoise = /*@__PURE__*/ Fn(([v]) => {
  const C = vec2(1 / 6, 1 / 3);
  const D = vec4(0, 0.5, 1, 2);

  // First corner
  const i = floor(v.add(dot(v, C.yyy))).toVar();
  const x0 = v.sub(i).add(dot(i, C.xxx)).toVar();

  // Other corners
  const g = step(x0.yzx, x0.xyz);
  const l = float(1).sub(g);
  const i1 = min(g.xyz, l.zxy).toVar();
  const i2 = max(g.xyz, l.zxy).toVar();

  const x1 = x0.sub(i1).add(C.xxx).toVar();
  const x2 = x0.sub(i2).add(C.xxx.mul(2)).toVar();
  const x3 = x0.sub(1).add(C.xxx.mul(3)).toVar();

  // Permutations
  const im = mod(i, 289);
  const p = permute(
    permute(
      permute(im.z.add(vec4(0, i1.z, i2.z, 1)))
        .add(im.y)
        .add(vec4(0, i1.y, i2.y, 1))
    )
      .add(im.x)
      .add(vec4(0, i1.x, i2.x, 1))
  ).toVar();

  // Gradients (N*N points uniformly over a square, mapped onto an octahedron)
  const n_ = float(1 / 7); // N=7
  const ns = n_.mul(D.wyz).sub(D.xzx);

  const j = p.sub(floor(p.mul(ns.z).mul(ns.z)).mul(49)); // mod(p,N*N)

  const x_ = floor(j.mul(ns.z));
  const y_ = floor(j.sub(x_.mul(7))); // mod(j,N)

  const x = x_.mul(ns.x).add(ns.yyyy);
  const y = y_.mul(ns.x).add(ns.yyyy);
  const h = float(1).sub(abs(x)).sub(abs(y)).toVar();

  const b0 = vec4(x.xy, y.xy);
  const b1 = vec4(x.zw, y.zw);

  const s0 = floor(b0).mul(2).add(1);
  const s1 = floor(b1).mul(2).add(1);
  const sh = step(h, vec4(0)).negate();

  const a0 = b0.xzyw.add(s0.xzyw.mul(sh.xxyy)).toVar();
  const a1 = b1.xzyw.add(s1.xzyw.mul(sh.zzww)).toVar();

  const g0 = vec3(a0.xy, h.x);
  const g1 = vec3(a0.zw, h.y);
  const g2 = vec3(a1.xy, h.z);
  const g3 = vec3(a1.zw, h.w);

  // Normalise gradients
  const norm = taylorInvSqrt(
    vec4(dot(g0, g0), dot(g1, g1), dot(g2, g2), dot(g3, g3))
  ).toVar();
  const p0 = g0.mul(norm.x);
  const p1 = g1.mul(norm.y);
  const p2 = g2.mul(norm.z);
  const p3 = g3.mul(norm.w);

  // Mix final noise value
  const m = max(
    float(0.6).sub(vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3))),
    0
  ).toVar();
  const m2 = m.mul(m);
  return dot(
    m2.mul(m2),
    vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3))
  ).mul(42);
}).setLayout({
  name: 'snoise',
  type: 'float',
  inputs: [{ name: 'v', type: 'vec3' }],
});
