uniform float uTime;
uniform float uDeformationStrength;
uniform float uWiggleSpeed;

// Body spans local Z in fish.glb: head at +3.0, tail at -5.01
const float HEAD_Z = 3.0;
const float TAIL_Z = -5.01;

// Balance point ~1/3 behind the head: the body rotates around it, so the
// head recoils opposite the tail instead of staying welded in place
const float PIVOT_Z = 0.6;

// How far (radians) the wave phase advances from head to tail — makes the
// bend ripple backward along the body instead of flexing all at once
const float WAVE_TRAVEL = 2.0;

// The head still sways/yaws at this fraction of the tail amplitude
const float HEAD_AMPLITUDE = 0.15;

void main() {
  // 0 at the head, 1 at the tail tip
  float bodyFactor = clamp((HEAD_Z - position.z) / (HEAD_Z - TAIL_Z), 0.0, 1.0);

  // Amplitude envelope: small but non-zero at the head, largest at the tail
  float envelope = mix(HEAD_AMPLITUDE, 1.0, pow(bodyFactor, 1.6));

  // Per-instance phase so the two fish don't swish in sync
  float phase = float(gl_InstanceID) * 2.4;

  // Traveling wave: the tail lags the head, so the head is already swinging
  // back (counter-phase recoil) while the tail finishes its sweep
  float bendAngle =
    sin(uTime * uWiggleSpeed + phase - bodyFactor * WAVE_TRAVEL) *
    uDeformationStrength *
    envelope;

  // Rotate each vertex around Y about the pivot; the per-vertex angle curls
  // the body into an arc while keeping its length
  float c = cos(bendAngle);
  float s = sin(bendAngle);
  float zFromPivot = position.z - PIVOT_Z;

  csm_Position = position;
  csm_Position.x = position.x * c + zFromPivot * s;
  csm_Position.z = PIVOT_Z + zFromPivot * c - position.x * s;
}
