// Animation names
export const ANIMATION_IDLE = 'Idle';
export const ANIMATION_RUN = 'Run';
export const ANIMATION_SPRINT = 'Sprint';
export const ANIMATION_JUMP = 'JumpRunning';
export const ANIMATION_FALLING = 'Falling';

// Character default speeds
export const DEFAULT_CHARACTER_SPEED = 4;
export const DEFAULT_CHARACTER_SPRINT_SPEED = 6;

// Vertical takeoff speed: the jump impulse rapier was tuned with (1.2) /
// capsule mass (0.18326). The controller SETS the vertical velocity to this on jump
// instead of adding the impulse, so slope-climb vertical speed doesn't stack
// into the jump — same jump strength on any ground
export const CHARACTER_JUMP_SPEED = 6.548089504241943;
