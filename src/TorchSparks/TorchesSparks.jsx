import { useMemo } from "react";
import TorchSparks from "./TorchSparks/TorchSparks";
import { useThree } from "@react-three/fiber";

/*
*   Config
*/
const PARTICLES_COUNT = 40; // Number of particles per torch

const SMALL_TORCHES_SPARKS = {
    size: 60,
    scale: [0.45, 0.9, 0.45],
    offsets: [
        [-12.85, 2.00, -36.78],
        [-30.77, 6.62, -79.09],
        [-40.71, 6.61, -79.41],
        [-41.16, 6.57, -68.95],
        [-24.17, 8.88, -104.15],
        [-33.97, 8.78, -117.45],
        [-10.42, 8.81, -117.77]
    ]
}

const MEDIUM_TORCHES_SPARKS = {
    size: 80,
    scale: [0.8, 1.3, 0.8],
    offsets: [
        [-7.86, 6.58, -72.52],
        [-16.43, 6.58, -72.50]
    ]
}

const LARGE_TORCHES_SPARKS = {
    size: 180,
    scale: [1.5, 3, 1.5],
    offsets: [
        [-0.94, 2.40, -37.16]
    ]
}

const TorchesSparks = (props) => {

    const pixelRatio =  useThree(state => state.gl).getPixelRatio();

    return (    
        <>
            <TorchSparks particlesCount={PARTICLES_COUNT} config={SMALL_TORCHES_SPARKS} pixelRatio={pixelRatio}/>
            <TorchSparks particlesCount={PARTICLES_COUNT} config={MEDIUM_TORCHES_SPARKS} pixelRatio={pixelRatio} />
            <TorchSparks particlesCount={PARTICLES_COUNT} config={LARGE_TORCHES_SPARKS} pixelRatio={pixelRatio} />
        </>
    );
};

export default TorchesSparks;