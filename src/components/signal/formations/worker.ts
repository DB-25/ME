/// <reference lib="webworker" />
import type { FormationId } from "@/lib/director/protocol";
import { generateFormation } from "./generate";

/** Generates formations off the main thread; each reply hands its buffer over without a copy. */
export type FormationRequest = { id: FormationId; count: number };
export type FormationReply = { id: FormationId; count: number; data: Float32Array };

self.onmessage = (event: MessageEvent<FormationRequest>) => {
  const { id, count } = event.data;
  const data = generateFormation(id, count);
  const reply: FormationReply = { id, count, data };
  (self as unknown as Worker).postMessage(reply, [data.buffer]);
};
