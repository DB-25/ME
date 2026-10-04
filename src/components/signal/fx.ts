import { HalfFloatType, type PerspectiveCamera, type Scene, type WebGLRenderer } from "three";
import { BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";

/** Desktop postprocessing: bloom, Reinhard tone mapping and a vignette in one merged pass. Its own async chunk. */
export type Fx = {
  render(delta: number): void;
  setSize(width: number, height: number): void;
  setBloom(intensity: number): void;
  dispose(): void;
};

export function createFx(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, bloomIntensity: number): Fx {
  const composer = new EffectComposer(renderer, { multisampling: 0, frameBufferType: HalfFloatType });
  const bloom = new BloomEffect({ mipmapBlur: true, intensity: bloomIntensity, luminanceThreshold: 0.3, luminanceSmoothing: 0.5, radius: 0.7 });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new EffectPass(camera, bloom, new ToneMappingEffect({ mode: ToneMappingMode.REINHARD }), new VignetteEffect({ eskil: false, offset: 0.28, darkness: 0.7 })),
  );
  return {
    render: (delta) => composer.render(delta),
    setSize: (w, h) => composer.setSize(w, h, false),
    setBloom: (i) => {
      bloom.intensity = i;
    },
    dispose: () => composer.dispose(),
  };
}
