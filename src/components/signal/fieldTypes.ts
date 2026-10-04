export type FieldQuality = {
  count: number;
  sizeBoost: number;
  reducedMotion: boolean;
  coarse: boolean;
  maxDpr: number;
  /** Phones: no postprocessing chunk, the bloom, vignette and tone curve are approximated in the point shader. */
  lean: boolean;
};

/** What the engine loop needs from the field and the camera rig, so neither knows about the renderer. */
export type FrameInfo = { delta: number; now: number; width: number; height: number };
