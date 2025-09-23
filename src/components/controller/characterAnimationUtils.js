const IDLE = 'Idle';
const RUN = 'Run';
const SPRINT = 'Sprint';
const JUMP = 'JumpRunning';

const updateCharacterAnimation = (
  currentAnimation,
  newAnimation,
  characterAnimations
) => {
  characterAnimations.actions[currentAnimation].fadeOut(0.2);
  characterAnimations.actions[newAnimation].reset().fadeIn(0.2).play();
  return newAnimation;
};

const playRunAnimation = (currentAnimation, characterAnimations) => {
  return updateCharacterAnimation(currentAnimation, RUN, characterAnimations);
};

const playIdleAnimation = (currentAnimation, characterAnimations) => {
  return updateCharacterAnimation(currentAnimation, IDLE, characterAnimations);
};

const playSprintAnimation = (currentAnimation, characterAnimations) => {
  return updateCharacterAnimation(
    currentAnimation,
    SPRINT,
    characterAnimations
  );
};

const playJumpAnimation = (currentAnimation, characterAnimations) => {
  return updateCharacterAnimation(currentAnimation, JUMP, characterAnimations);
};

export {
  playRunAnimation,
  playIdleAnimation,
  playSprintAnimation,
  playJumpAnimation,
};
