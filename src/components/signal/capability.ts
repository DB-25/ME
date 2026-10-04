/** Decides whether the live field may run at all: software rendering falls back to a still instead of a frozen tab. */
import type { GpuReply, GpuVerdict } from "./gpuProbe.worker";
import { isSoftwareRendererName } from "./softwareRenderer";

/** Thrown (or reported) when the field should not run on this machine; the page shows its poster instead. */
export class FieldUnavailableError extends Error {
  constructor(reason: string) {
    super(`signal field unavailable: ${reason}`);
    this.name = "FieldUnavailableError";
  }
}

/** `?field=live` forces the live field even on software GL; `?field=poster` forces the still. Anything else: automatic. */
export function fieldOverride(): "live" | "poster" | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("field");
  return value === "live" || value === "poster" ? value : null;
}

/**
 * The GPU safeguards (software-renderer check, slow-frame bail) run in production builds only, so local
 * development and screenshot scripts keep the field on software GL unless they ask for the poster.
 */
export function shouldGuardGpu(): boolean {
  return process.env.NODE_ENV === "production" && fieldOverride() !== "live";
}

export function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return isSoftwareRendererName(String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)));
}

/** Give up on the probe after this long: a machine that slow cannot run the field anyway. */
const PROBE_TIMEOUT_MS = 8000;

let probing: Promise<GpuVerdict> | null = null;

/**
 * Asks a worker what GPU this is, so the main thread never makes the first (possibly software) context itself.
 * "unknown" (no OffscreenCanvas WebGL, no Worker) lets the engine carry on and rely on its own checks.
 * Memoized: call it as early as you like, the engine awaits the same promise.
 */
export function probeGpu(): Promise<GpuVerdict> {
  if (probing) return probing;
  probing = new Promise<GpuVerdict>((resolve) => {
    if (typeof Worker === "undefined") return resolve("unknown");
    let worker: Worker;
    try {
      worker = new Worker(new URL("./gpuProbe.worker.ts", import.meta.url));
    } catch {
      return resolve("unknown");
    }
    const finish = (verdict: GpuVerdict) => {
      window.clearTimeout(timer);
      worker.terminate();
      resolve(verdict);
    };
    const timer = window.setTimeout(() => finish("software"), PROBE_TIMEOUT_MS);
    worker.onmessage = (event: MessageEvent<GpuReply>) => finish(event.data.verdict);
    worker.onerror = () => finish("unknown");
    worker.postMessage(null);
  });
  return probing;
}
