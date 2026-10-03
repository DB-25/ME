import * as THREE from "three";
import { getFormation, signalAttributes, signalLayout, signalRotation } from "./formations";
import { FRAGMENT, VERTEX } from "./shaders";

const PARTICLE_WORLD_SIZE = 0.042;
const BOUNDING_RADIUS = 40;

export const BASE_PARTICLE_SIZE = PARTICLE_WORLD_SIZE;

export type FieldBuffers = {
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  /** Formation buffers by `f:<id>`; filled lazily as chapters approach. */
  attrs: Map<string, THREE.BufferAttribute>;
};

/** Per-particle random seeds: x seed, y size jitter, z heat, w phase. */
function randomAttribute(count: number): THREE.BufferAttribute {
  const rand = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    rand[i * 4] = Math.random();
    rand[i * 4 + 1] = 0.6 + Math.random() * 0.8;
    rand[i * 4 + 2] = Math.random();
    rand[i * 4 + 3] = Math.random();
  }
  return new THREE.BufferAttribute(rand, 4);
}

/** Geometry, shader material and the buffer cache. Only the noise formation exists up front. */
export function createFieldBuffers(count: number): FieldBuffers {
  const geometry = new THREE.BufferGeometry();
  const layout = signalLayout(count);
  geometry.setAttribute("aRand", randomAttribute(count));
  geometry.setAttribute("aSig", new THREE.BufferAttribute(signalAttributes(count), 4));
  // Placeholder so the geometry is valid before the first formation lands.
  const noiseAttr = new THREE.BufferAttribute(getFormation("noise", count), 3);
  geometry.setAttribute("position", noiseAttr);
  geometry.setAttribute("aB", noiseAttr);
  geometry.setAttribute("aC", noiseAttr);
  geometry.setAttribute("aD", noiseAttr);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), BOUNDING_RADIUS);

  const sigRot = signalRotation(layout) as [number, number, number, number, number, number, number, number, number];
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
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
      uPointer: { value: new THREE.Vector2(9, 9) },
      uPointerStrength: { value: 0 },
      uAspect: { value: 1 },
      uScale: { value: 1000 },
      uSize: { value: PARTICLE_WORLD_SIZE },
      uPixelRatio: { value: 1 },
      uOffset: { value: new THREE.Vector3() },
      uFog: { value: 0.09 },
      uSigA: { value: 0 },
      uSigB: { value: 0 },
      uSigDims: { value: new THREE.Vector4(layout.width, layout.depth, layout.wavelength, layout.amplitude) },
      uSigParam: { value: new THREE.Vector4(layout.noise, layout.phasePerLine, 0, 0) },
      uSigRot: { value: new THREE.Matrix3().set(...sigRot) },
      uAlpha: { value: 0.5 },
      uBrightness: { value: 1 },
      uRightDim: { value: 0 },
      uHueColor: { value: new THREE.Color("#8b7bff") },
      uHueMix: { value: 0 },
    },
  });
  return { geometry, material, attrs: new Map([["f:noise", noiseAttr]]) };
}
