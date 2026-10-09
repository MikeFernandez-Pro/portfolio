// Physics body types
export const BODY_TYPE_DYNAMIC = 0;
export const BODY_TYPE_FIXED = 1;

// Animation names
export const ANIMATION_IDLE = 'Idle';
export const ANIMATION_RUN = 'Run';
export const ANIMATION_SPRINT = 'Sprint';
export const ANIMATION_JUMP = 'JumpRunning';
export const ANIMATION_FALLING = 'Falling';

// Character default speeds
export const DEFAULT_CHARACTER_SPEED = 4;
export const DEFAULT_CHARACTER_SPRINT_SPEED = 6;

// Vertical takeoff speed: the rapier-era jump applyImpulse(1.2) / capsule
// mass (0.18326). The controller SETS the vertical velocity to this on jump
// instead of adding the impulse, so slope-climb vertical speed doesn't stack
// into the jump — same jump strength on any ground
export const CHARACTER_JUMP_SPEED = 6.548089504241943;

// Camera defaults
export const CAMERA_FOLLOW_HEIGHT = 5.2;
export const CAMERA_FOLLOW_DISTANCE_MOBILE = 7.5;
export const CAMERA_FOLLOW_DISTANCE_DESKTOP = 5.5;

// Initial camera offset (before intro animation)
export const CAMERA_INITIAL_OFFSET = { x: -3.5, y: 17.4, z: 29.6 };

// Intro camera pan length, and when the character controls unlock during it
// (2s before the end; power3.out: the pan is ~94% done by then)
export const CAMERA_INTRO_DURATION = 5;
export const INTRO_CONTROLS_UNLOCK_AT = CAMERA_INTRO_DURATION - 2;
