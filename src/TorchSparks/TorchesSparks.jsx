import { useEffect, useMemo, useRef } from "react";
import TorchSparks from "./TorchSparks/TorchSparks";
import { useThree } from "@react-three/fiber";
import { useStore } from "../ZustandStorage";
import * as THREE from "three";

/*
 *   Config
 */
const PARTICLES_COUNT = 40; // Number of particles per torch

const SMALL_TORCHES_SPARKS = {
    size: 60,
    scale: [0.45, 0.9, 0.45],
    offsets: [
        [-12.85, 2.0, -36.78], // -5.8, 1.7, -16.6
        [-30.77, 6.6, -79.09], // -18.5, 5.9, -31
        [-40.71, 6.59, -79.41], // -18.3 5.9 -35.7
        [-41.16, 6.55, -68.95], // -13.8 5.9 -35.6
        [-24.17, 8.82, -104.15], // -10.9 8.0 -46.9
        [-33.97, 8.65, -117.45], // -15.3 7.8 -52.9
        [-10.42, 8.75, -117.77], // -4.7 7.9 -53.0
    ],
};

const MEDIUM_TORCHES_SPARKS = {
    size: 80,
    scale: [0.8, 1.3, 0.8],
    offsets: [
        [-7.86, 6.55, -72.52], // -6.3 8.5 -58.0
        [-16.43, 6.55, -72.5], // -13.2 8.5 -58.0
    ],
};

const LARGE_TORCHES_SPARKS = {
    size: 180,
    scale: [1.5, 3, 1.5],
    offsets: [
        [-0.94, 2.4, -37.16], // -1.5 7.1 -55.8
    ],
};

const TORCHES_POSITIONS = [
    [-5.8, 1.7, -16.6],
    [-18.5, 5.9, -31],
    [-18.3, 5.9, -35.7],
    [-13.8, 5.9, -35.6],
    [-10.9, 8.0, -46.9],
    [-15.3, 7.8, -52.9],
    [-4.7, 7.9, -53.0],
    [-6.3, 8.5, -58.0],
    [-13.2, 8.5, -58.0],
    [-1.5, 7.1, -55.8],
];

const torchesConfig = new Array(TORCHES_POSITIONS.length).fill(undefined).map((_, index) => {
    // Sound Effect by Julius H.
    // https://pixabay.com/fr/users/juliush-3921568/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=8012
    const soundEffect = new Audio("/sounds/torchesSoundEffect.mp3");
    soundEffect.loop = true;
    soundEffect.volume = 0;
    soundEffect.playbackRate = 1.5;
    soundEffect.currentTime = Math.random() * 50;
    return { soundEffect, position: new THREE.Vector3(...TORCHES_POSITIONS[index]) };
});

const TorchesSparks = () => {
    const soundActivatedRef = useRef(useStore.getState().soundActivated);
    const pixelRatio = useThree((state) => state.gl).getPixelRatio();

    useEffect(() => {
        const unsubExperienceStarted = useStore.subscribe(
            (state) => state.experienceStarted,
            (experienceStarted) => {
                if (experienceStarted) {
                    for (const torch of torchesConfig) {
                        torch.soundEffect.play();
                    }
                }
            }
        );
        
        const unsubCharacterPosition = useStore.subscribe(
            (state) => state.characterPosition,
            (characterPosition) => {
                if (characterPosition) {
                    for (const torchConfig of torchesConfig) {
                        torchConfig.distanceToCharacter =
                            torchConfig.position.distanceTo(characterPosition);
                        torchConfig.soundEffect.volume = !soundActivatedRef.current
                            ? 0
                            : torchConfig.distanceToCharacter < 13
                            ? Math.min(1 / torchConfig.distanceToCharacter, 0.2)
                            : 0;
                    }
                }
            }
        );

        const unsubSoundActivated = useStore.subscribe(
            (state) => state.soundActivated,
            (soundActivated) => {
                soundActivatedRef.current = soundActivated;
            }
        );

        // Clear animations, interval and subscriptions on unmount
        return () => {
            unsubExperienceStarted();
            unsubCharacterPosition();
            unsubSoundActivated();
        };
    }, []);

    return (
        <>
            <TorchSparks
                particlesCount={PARTICLES_COUNT}
                config={SMALL_TORCHES_SPARKS}
                pixelRatio={pixelRatio}
            />
            <TorchSparks
                particlesCount={PARTICLES_COUNT}
                config={MEDIUM_TORCHES_SPARKS}
                pixelRatio={pixelRatio}
            />
            <TorchSparks
                particlesCount={PARTICLES_COUNT}
                config={LARGE_TORCHES_SPARKS}
                pixelRatio={pixelRatio}
            />
        </>
    );
};

export default TorchesSparks;
