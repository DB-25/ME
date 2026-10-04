/// <reference lib="webworker" />
/**
 * Creates a throwaway WebGL context off the main thread and reports what kind of renderer sits behind it.
 * Creating a context on a machine without GPU acceleration (SwiftShader, llvmpipe) blocks whoever calls it for
 * seconds, so the first one must never be made on the main thread.
 */
import { isSoftwareRendererName } from "./softwareRenderer";

export type GpuVerdict = "ok" | "software" | "unknown";
export type GpuReply = { verdict: GpuVerdict; renderer: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;

function contextOf(canvas: OffscreenCanvas, failIfMajorPerformanceCaveat: boolean): WebGL2RenderingContext | null {
  try {
    return canvas.getContext("webgl2", { failIfMajorPerformanceCaveat, powerPreference: "high-performance" }) as WebGL2RenderingContext | null;
  } catch {
    return null;
  }
}

function rendererOf(gl: WebGL2RenderingContext): string {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
}

function probe(): GpuReply {
  if (typeof OffscreenCanvas === "undefined") return { verdict: "unknown", renderer: "" };
  const hardware = contextOf(new OffscreenCanvas(1, 1), true);
  if (hardware) {
    const renderer = rendererOf(hardware);
    hardware.getExtension("WEBGL_lose_context")?.loseContext();
    return { verdict: isSoftwareRendererName(renderer) ? "software" : "ok", renderer };
  }
  // No hardware context. If a plain one exists the browser only has software GL; if not, it cannot create GL in a worker at all.
  const plain = contextOf(new OffscreenCanvas(1, 1), false);
  if (!plain) return { verdict: "unknown", renderer: "" };
  const renderer = rendererOf(plain);
  plain.getExtension("WEBGL_lose_context")?.loseContext();
  return { verdict: "software", renderer };
}

scope.onmessage = () => {
  let reply: GpuReply;
  try {
    reply = probe();
  } catch {
    reply = { verdict: "unknown", renderer: "" };
  }
  scope.postMessage(reply);
};
