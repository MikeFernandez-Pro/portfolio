// Anything above this is a teleport, not gameplay (run start/stop velocity
// snaps peak around |Δv|/dt ≈ 700 at 165Hz)
const MAX_ACCEL = 2000;

const clampAngle = (value, limit) => Math.min(Math.max(value, -limit), limit);
const wrapAngle = value => Math.atan2(Math.sin(value), Math.cos(value));

/**
 * Damped pendulum for the character lantern, driven by the body's
 * acceleration and turn rate. `settings` (stiffness, damping, maxAngle,
 * influence, yawInfluence, verticalInfluence, smoothing) is read live.
 * `step` returns the swing angles { angX, angZ } (the same object every
 * frame, no allocations); `reset` makes the next step start from rest.
 */
const createLanternSwing = settings => {
  const sim = {
    initialized: false,
    prevVelX: 0,
    prevVelY: 0,
    prevVelZ: 0,
    accX: 0,
    accY: 0,
    accZ: 0,
    prevYaw: 0,
    angX: 0,
    angZ: 0,
    velX: 0,
    velZ: 0,
  };

  const reset = () => {
    sim.initialized = false;
  };

  // `velocity`: body linear velocity, `yaw`: character facing, `paused`: the
  // body is held still (no swing target)
  const step = (dt, velocity, yaw, paused) => {
    if (paused || !sim.initialized) {
      // Respawn teleports and pauses must not read as huge accelerations
      sim.prevVelX = velocity.x;
      sim.prevVelY = velocity.y;
      sim.prevVelZ = velocity.z;
      sim.accX = sim.accY = sim.accZ = 0;
      sim.prevYaw = yaw;
      sim.initialized = true;
    }

    let ax = (velocity.x - sim.prevVelX) / dt;
    let ay = (velocity.y - sim.prevVelY) / dt;
    let az = (velocity.z - sim.prevVelZ) / dt;
    sim.prevVelX = velocity.x;
    sim.prevVelY = velocity.y;
    sim.prevVelZ = velocity.z;
    if (ax * ax + ay * ay + az * az > MAX_ACCEL * MAX_ACCEL) {
      ax = ay = az = 0;
    }

    // One-frame velocity snaps smooth into a frame-rate independent pulse
    // (peak ≈ Δv * smoothing)
    const blend = 1 - Math.exp(-settings.smoothing * dt);
    sim.accX += (ax - sim.accX) * blend;
    sim.accY += (ay - sim.accY) * blend;
    sim.accZ += (az - sim.accZ) * blend;

    const yawRate = wrapAngle(yaw - sim.prevYaw) / dt;
    sim.prevYaw = yaw;

    // World acceleration into the character's local frame
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const localAX = cos * sim.accX - sin * sim.accZ;
    const localAZ = sin * sim.accX + cos * sim.accZ;

    // The lantern bottom lags opposite the acceleration; turning flings it
    // sideways, vertical acceleration (jump/land) bobs it fore/aft
    let targetX = 0;
    let targetZ = 0;
    if (!paused) {
      targetX = clampAngle(
        settings.influence * localAZ - settings.verticalInfluence * sim.accY,
        settings.maxAngle
      );
      targetZ = clampAngle(
        -settings.influence * localAX + settings.yawInfluence * yawRate,
        settings.maxAngle
      );
    }

    // Semi-implicit Euler damped spring
    sim.velX +=
      (settings.stiffness * (targetX - sim.angX) -
        settings.damping * sim.velX) *
      dt;
    sim.velZ +=
      (settings.stiffness * (targetZ - sim.angZ) -
        settings.damping * sim.velZ) *
      dt;
    sim.angX = clampAngle(sim.angX + sim.velX * dt, settings.maxAngle);
    sim.angZ = clampAngle(sim.angZ + sim.velZ * dt, settings.maxAngle);

    return sim;
  };

  return { step, reset };
};

export { createLanternSwing };
