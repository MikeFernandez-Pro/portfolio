export function directionOffset({ forward, backward, leftward, rightward }, characterBody) {
    if (!forward && !backward && !leftward && !rightward) return undefined;

    if (characterBody.current.isSleeping()) {
        characterBody.current.wakeUp();
    }

    if (forward && leftward) return (7 * Math.PI) / 4;
    if (forward && rightward) return (5 * Math.PI) / 4;
    if (backward && leftward) return Math.PI / 4;
    if (backward && rightward) return (3 * Math.PI) / 4;
    if (backward) return Math.PI / 2;
    if (leftward) return 0;
    if (rightward) return -Math.PI;

    return -Math.PI / 2;
}

export function updateCharacterAnimation(characterAnimations, currentAnimation, newAnimation) {
    characterAnimations.actions[currentAnimation].fadeOut(0.2);
    currentAnimation = newAnimation;
    characterAnimations.actions[currentAnimation].reset().fadeIn(0.2).play();
}

/**
 * Listeners
 */
