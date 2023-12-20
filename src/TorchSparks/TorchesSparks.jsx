import { useEffect, useMemo } from "react";
import TorchSparks from "./TorchSparks/TorchSparks";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useStore } from "../ZustandStorage";

/*
*   Config
*/
const PARTICLES_COUNT = 40; // Number of particles per torch

const SMALL_TORCHES_SPARKS = {
    size: 60,
    scale: [0.45, 0.9, 0.45],
    offsets: [
        [-12.85, 2.00, -36.78], // -5.8, 1.7, -16.6
        [-30.77, 6.62, -79.09], // -18.5, 5.9, -31
        [-40.71, 6.61, -79.41], // -18.3 5.9 -35.7
        [-41.16, 6.57, -68.95], // -13.8 5.9 -35.6
        [-24.17, 8.88, -104.15], // -10.9 8.0 -46.9
        [-33.97, 8.78, -117.45], // -15.3 7.8 -52.9
        [-10.42, 8.81, -117.77] // -4.7 7.9 -53.0
    ]
}

const MEDIUM_TORCHES_SPARKS = {
    size: 80,
    scale: [0.8, 1.3, 0.8],
    offsets: [
        [-7.86, 6.58, -72.52], // -6.3 8.5 -58.0
        [-16.43, 6.58, -72.50] // -13.2 8.5 -58.0
    ]
}

const LARGE_TORCHES_SPARKS = {
    size: 180,
    scale: [1.5, 3, 1.5],
    offsets: [
        [-0.94, 2.40, -37.16] // -1.5 7.1 -55.8
    ]
}

const torchesSoundsEffects = [
    { position: new Vector3(-5.8, 1.7, -16.6) },
    { position: new Vector3(- 18.5, 5.9, -31) },
    { position: new Vector3(- 18.3, 5.9, -35.7) },
    { position: new Vector3(- 13.8, 5.9, -35.6) },
    { position: new Vector3(- 10.9, 8.0, -46.9) },
    { position: new Vector3(- 15.3, 7.8, -52.9) },
    { position: new Vector3(- 4.7, 7.9, -53.0) },
    { position: new Vector3(-6.3, 8.5, -58.0) },
    { position: new Vector3(-13.2, 8.5, -58.0) },
    { position: new Vector3(-1.5, 7.1, -55.8) },
]

const TorchesSparks = () => {

    const pixelRatio = useThree(state => state.gl).getPixelRatio();

    useEffect(() => {

        for (const torchSoundEffect of torchesSoundsEffects) {
            // Sound Effect by Julius H.
            // https://pixabay.com/fr/users/juliush-3921568/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=8012
            torchSoundEffect.soundEffect = new Audio("/sounds/torchesSoundEffect.mp3")
            torchSoundEffect.soundEffect.loop = true;
            torchSoundEffect.soundEffect.volume = 0;
            // Speed up sound effect
            torchSoundEffect.soundEffect.playbackRate = 1.5;
            // Offset sound effect playback
            torchSoundEffect.soundEffect.currentTime = Math.random() * 50;
            torchSoundEffect.soundEffect.play();
        }

        const unsubCharacterPosition = useStore.subscribe(
            state => state.characterPosition,
            (characterPosition) => {
                if (characterPosition) {
                    for (const torchSoundEffect of torchesSoundsEffects) {
                        torchSoundEffect.distanceToCharacter = torchSoundEffect.position.distanceTo(characterPosition);
                        torchSoundEffect.soundEffect.volume = torchSoundEffect.distanceToCharacter < 13 ?
                            Math.min(((1 / torchSoundEffect.position.distanceTo(characterPosition)) ), 0.3) 
                            : 0;    
                    }
                }
            }
        )

        // Clear animations, interval and subscriptions on unmount
        return () => {
            for (const torchSoundEffect of torchesSoundsEffects) {
                torchSoundEffect.soundEffect.pause();
                torchSoundEffect.soundEffect.currentTime = 0;
            }

            unsubCharacterPosition();
        }
    }, []);

    return (
        <>
            <TorchSparks particlesCount={PARTICLES_COUNT} config={SMALL_TORCHES_SPARKS} pixelRatio={pixelRatio} />
            <TorchSparks particlesCount={PARTICLES_COUNT} config={MEDIUM_TORCHES_SPARKS} pixelRatio={pixelRatio} />
            <TorchSparks particlesCount={PARTICLES_COUNT} config={LARGE_TORCHES_SPARKS} pixelRatio={pixelRatio} />
        </>
    );
};

export default TorchesSparks;