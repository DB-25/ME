import type { FormationId } from "@/lib/director/protocol";
import { constellationFormation } from "./constellation";
import { crosshairFormation } from "./crosshair";
import { crowdFormation } from "./crowd";
import { globeFormation } from "./globe";
import { networkFormation } from "./network";
import { noiseFormation } from "./noise";
import { mulberry32, shufflePoints } from "./rng";
import { signalFormation } from "./signal";
import { singularityFormation } from "./singularity";

/** Pure generation (no DOM, no caches), shared by the main thread fallback and the formation worker. */
type Generator = (count: number) => Float32Array;

const GENERATORS: Record<FormationId, Generator> = {
  noise: noiseFormation,
  signal: signalFormation,
  globe: globeFormation,
  network: networkFormation,
  crowd: crowdFormation,
  constellation: constellationFormation,
  crosshair: crosshairFormation,
  singularity: singularityFormation,
};

/** Formations whose particle index carries meaning (line / slot) must keep their order. */
const UNSHUFFLED: FormationId[] = ["signal"];

/** Generated and shuffled so any prefix is an unbiased subset (used for adaptive quality). */
export function generateFormation(id: FormationId, count: number): Float32Array {
  const raw = GENERATORS[id](count);
  return UNSHUFFLED.includes(id) ? raw : shufflePoints(raw, mulberry32(count + id.length * 7919));
}
