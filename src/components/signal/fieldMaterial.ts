import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Matrix3, ShaderMaterial, Sphere, Vector2, Vector3, Vector4 } from "three";
import { getFormation, signalAttributes, signalLayout, signalRotation } from "./formations";
import { particleSeeds } from "./formations/seeds";
import { FRAGMENT, VERTEX } from "./shaders";

const PARTICLE_WORLD_SIZE = 0.042;
const BOUNDING_RADIUS = 40;

export const BASE_PARTICLE_SIZE = PARTICLE_WORLD_SIZE;

export type FieldBuffers = {
  geometry: BufferGeometry;
  material: ShaderMaterial;
  /** Formation buffers by `f:<id>`; filled lazily as chapters approach. */
  attrs: Map<string, BufferAttribute>;
};

/** Geometry, shader material and the buffer cache. Only the noise formation exists up front. `lean` compiles in the shader's own glow, vignette and tone curve (no postprocessing). */
export function createFieldBuffers(count: number, lean: boolean): FieldBuffers {
  const geometry = new BufferGeometry();
  const layout = signalLayout(count);
  geometry.setAttribute("aRand", new BufferAttribute(particleSeeds(count), 4));
  geometry.setAttribute("aSig", new BufferAttribute(signalAttributes(count), 4));
  // Placeholder so the geometry is valid before the first formation lands.
  const noiseAttr = new BufferAttribute(getFormation("noise", count), 3);
  geometry.setAttribute("position", noiseAttr);
  geometry.setAttribute("aB", noiseAttr);
  geometry.setAttribute("aC", noiseAttr);
  geometry.setAttribute("aD", noiseAttr);
  geometry.boundingSphere = new Sphere(new Vector3(), BOUNDING_RADIUS);

  const sigRot = signalRotation(layout) as [number, number, number, number, number, number, number, number, number];
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    defines: lean ? { LEAN: 1 } : {},
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    uniforms: {
      uMorph: { value: 0 },
      uOverride: { value: 0 },
      uOverrideMix: { value: 0 },
      uTime: { value: 0 },
      uEnergy: { value: 0 },
      uStagger: { value: 0.45 },
      uTurb: { value: 1 },
      uDensity: { value: 1 },
      uSpark: { value: 1 },
      uSpread: { value: 1 },
      uPointer: { value: new Vector2(9, 9) },
      uPointerStrength: { value: 0 },
      uPointerRadius: { value: 0.42 },
      uBurst: { value: 0 },
      uBurstPos: { value: new Vector2(0, 0) },
      uAspect: { value: 1 },
      uScale: { value: 1000 },
      uSize: { value: PARTICLE_WORLD_SIZE },
      uPixelRatio: { value: 1 },
      uOffset: { value: new Vector3() },
      uFog: { value: 0.09 },
      uSigA: { value: 0 },
      uSigB: { value: 0 },
      uSigDims: { value: new Vector4(layout.width, layout.depth, layout.wavelength, layout.amplitude) },
      uSigParam: { value: new Vector4(layout.noise, layout.phasePerLine, 0, 0) },
      uSigRot: { value: new Matrix3().set(...sigRot) },
      uAlpha: { value: 0.5 },
      uBrightness: { value: 1 },
      uRightDim: { value: 0 },
      uHueColor: { value: new Color("#8b7bff") },
      uHueMix: { value: 0 },
      uBloom: { value: 0.4 },
      uGlobeRot: { value: new Matrix3() },
      uGlobeA: { value: 0 },
      uGlobeB: { value: 0 },
      uOvGlobe: { value: 0 },
      uArc: { value: 1 },
      uMark: { value: new Vector2(1, 1) },
    },
  });
  return { geometry, material, attrs: new Map([["f:noise", noiseAttr]]) };
}
