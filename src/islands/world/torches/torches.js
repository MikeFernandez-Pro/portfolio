// Every torch, in world space. Each effect keeps its own hand-placed spot
// around the flame: the light, the smoke column base (null: the bonfire has
// its own BonfireSmoke) and the sparks origin. `size` picks the sparks size
// class (TorchesSparks.jsx). Order matters for the lights: pointLights.js
// clusters consecutive nearby torches.
export const TORCHES = [
  {
    light: [-5.8, 1.7, -16.6],
    smoke: [-5.78, 1.7, -16.55],
    sparks: [-5.7825, 1.8, -16.551],
    size: 'small',
  },
  {
    light: [-18.5, 5.9, -31],
    smoke: [-18.51, 5.8, -30.99],
    sparks: [-18.522, 5.895, -31.0275],
    size: 'small',
  },
  {
    light: [-18.3, 5.9, -35.7],
    smoke: [-18.31, 5.8, -35.71],
    sparks: [-18.3195, 5.931, -35.7345],
    size: 'small',
  },
  {
    light: [-13.8, 5.9, -35.6],
    smoke: [-13.83, 5.8, -35.57],
    sparks: [-13.8465, 5.94, -35.5905],
    size: 'small',
  },
  {
    light: [-10.9, 8.0, -46.9],
    smoke: [-10.87, 7.88, -46.85],
    sparks: [-10.8765, 7.938, -46.8675],
    size: 'small',
  },
  {
    light: [-15.3, 7.8, -52.9],
    smoke: [-15.29, 7.69, -52.85],
    sparks: [-15.2865, 7.785, -52.8525],
    size: 'small',
  },
  {
    light: [-4.7, 7.9, -53.0],
    smoke: [-4.68, 7.8, -52.99],
    sparks: [-4.689, 7.875, -52.9965],
    size: 'small',
  },
  {
    light: [-6.3, 8.5, -58.0],
    smoke: [-6.28, 8.37, -57.97],
    sparks: [-6.288, 8.515, -58.016],
    size: 'medium',
  },
  {
    light: [-13.2, 8.5, -58.0],
    smoke: [-13.13, 8.4, -57.97],
    sparks: [-13.144, 8.515, -58],
    size: 'medium',
  },
  // The bonfire
  {
    light: [-1.5, 7.1, -55.8],
    smoke: null,
    sparks: [-1.41, 7.2, -55.74],
    size: 'large',
  },
];
