import { Effect } from "postprocessing";
import { Uniform } from "three";

import sceneRevealerFragmentShader from "/shaders/sceneRevealer/fragment.glsl";

export default class sceneRevealerEffect extends Effect {
  constructor(aspectRatio, perlinNoiseTexture) {
    super("sceneRevealerEffect", sceneRevealerFragmentShader, {
      uniforms: new Map([
        ["progress", new Uniform(0.35)],
        ["size", new Uniform(5)],
        ["aspectRatio", new Uniform(aspectRatio)],
        ["uTime", new Uniform(0)],
        ["uPerlinNoiseTexture", new Uniform(perlinNoiseTexture)],
      ]),
    });
  }
}
