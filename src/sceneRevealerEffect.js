import { Effect } from "postprocessing";
import { Uniform } from "three";

import sceneRevealerFragmentShader from "/shaders/sceneRevealer/fragment.glsl";

export default class sceneRevealerEffect extends Effect {
    constructor(aspectRatio) {
        super("sceneRevealerEffect", sceneRevealerFragmentShader, {
            uniforms: new Map([
                ["progress", new Uniform(-0.1)],
                ["size", new Uniform(15)],
                ["aspectRatio", new Uniform(aspectRatio)],
                ["uTime", new Uniform(0)],
            ]),
        });
    }
}
