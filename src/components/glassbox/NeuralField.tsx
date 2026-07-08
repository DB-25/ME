"use client";

/**
 * NeuralField — the 3D heart of the DB-1 glass box.
 *
 * A stylized neural network that "thinks": an input column, four hidden-layer
 * rings, an output column, and a teal "memory vault" cluster. Real signals
 * drive it — the owner increments `pulseRef` per streamed token (terracotta
 * wave, left→right) and `retrievalRef` per retrieval hit (teal wave from the
 * vault). Entering the eval/done phase fires one soft teal full-network sweep.
 *
 * All animation happens by mutation inside useFrame — never React state.
 * Nodes are ONE InstancedMesh (123 instances, per-instance color/scale);
 * edges are ONE LineSegments with per-vertex colors (additive blending).
 * Geometry is built once with a seeded RNG. No lights, no postprocessing.
 *
 * `reduced === true` renders a still, composed diagram: static colors, no
 * pulses, no camera drift, demand frameloop.
 *
 * Loaded via next/dynamic({ ssr: false }); the root <Canvas> fills its
 * container with a transparent background. A tiny error boundary renders
 * null if WebGL is unavailable so the overlay never crashes.
 */

import {
  Component,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import type { GlassPhase, NeuralFieldProps } from "./types";

// ---------------------------------------------------------------------------
// Palette (portfolio design language) — hex parsed as sRGB into linear
// working space once; raw linear floats are stored/re-set via setRGB.
// ---------------------------------------------------------------------------

const COL_IDLE_A = new THREE.Color("#3a3a40");
const COL_IDLE_B = new THREE.Color("#56565f");
const COL_TERRA = new THREE.Color("#E8845C");
const COL_TERRA_LIGHT = new THREE.Color("#F0A882");
const COL_TEAL = new THREE.Color("#5DCAA5");
const COL_BLUE = new THREE.Color("#85B7EB");

// Edge colors are tuned for additive blending over a near-black overlay:
// dim idle values read like ~0.08-opacity lines; accents glow on activation.
const EDGE_IDLE = new THREE.Color(0.05, 0.05, 0.062);
const EDGE_IDLE_VAULT = new THREE.Color(0.03, 0.075, 0.06);
const EDGE_TOKEN = COL_TERRA.clone().multiplyScalar(0.5);
const EDGE_TEAL = COL_TEAL.clone().multiplyScalar(0.5);

// ---------------------------------------------------------------------------
// Network layout constants.
// ---------------------------------------------------------------------------

const LAYER_X = [-7, -3.5, -1, 1.5, 4, 7] as const;
const INPUT_COUNT = 8;
const HIDDEN_COUNT = 26;
const OUTPUT_COUNT = 6;
const VAULT_COUNT = 5;
const VAULT_LAYER = 6; // pseudo-layer index for the vault cluster
const VAULT_CENTER = { x: -5.5, y: -3, z: 0.3 };
const RING_RADIUS = 2.2;
const EDGES_PER_PAIR = 70;
const VAULT_EDGES = 10;

// Pulse wave tuning.
const LAYER_DELAY = 0.09; // s between layers
const SIGMA = 0.12; // s gaussian width
const SWEEP_DELAY = 0.155;
const SWEEP_SIGMA = 0.2;
const PULSE_TTL = 1.05; // s (token/retrieval)
const SWEEP_TTL = 1.9;
const MIN_TOKEN_GAP = 0.04; // coalesce token bursts
const MIN_RETRIEVAL_GAP = 0.12;
const QUEUE_CAP = 24;

const INV_2S2 = 1 / (2 * SIGMA * SIGMA);
const INV_2S2_SWEEP = 1 / (2 * SWEEP_SIGMA * SWEEP_SIGMA);
const gauss = (x: number) => Math.exp(-x * x * INV_2S2);
const gaussSweep = (x: number) => Math.exp(-x * x * INV_2S2_SWEEP);

type PulseKind = "token" | "retrieval" | "sweep";
interface Pulse {
  t0: number;
  kind: PulseKind;
}

// Frame-loop temps — allocated once, reused every frame.
const TMP_M = new THREE.Matrix4();
const TMP_C = new THREE.Color();
const TMP_C2 = new THREE.Color();

// ---------------------------------------------------------------------------
// Pointer parallax — written by a window listener, read in useFrame.
// ---------------------------------------------------------------------------

const pointer = { x: 0, y: 0 };

function usePointerTracking(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled]);
}

// ---------------------------------------------------------------------------
// Deterministic network build (seeded RNG, computed once).
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Network {
  count: number;
  positions: Float32Array; // xyz per node
  layerOf: Uint8Array; // 0..5 layers, 6 = vault
  weight: Float32Array; // per-node wave response weight
  baseScale: Float32Array;
  idleColors: Float32Array; // linear rgb per node
  activeColors: Float32Array; // linear rgb per node (token accent target)
  edgeGeometry: THREE.BufferGeometry;
  edgeColorAttr: THREE.BufferAttribute;
  edgePair: Uint8Array; // 0..4 layer pairs, 5 = vault→hidden1
  segCount: number;
}

function buildNetwork(): Network {
  const rng = mulberry32(0xdb1);
  const count =
    INPUT_COUNT + HIDDEN_COUNT * 4 + OUTPUT_COUNT + VAULT_COUNT;

  const positions = new Float32Array(count * 3);
  const layerOf = new Uint8Array(count);
  const weight = new Float32Array(count);
  const baseScale = new Float32Array(count);
  const idleColors = new Float32Array(count * 3);
  const activeColors = new Float32Array(count * 3);

  const layerStart: number[] = [];
  const layerCount: number[] = [];
  const c = new THREE.Color();
  let i = 0;

  const put = (
    layer: number,
    x: number,
    y: number,
    z: number,
    scale: number,
    idle: THREE.Color,
    active: THREE.Color
  ) => {
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    layerOf[i] = layer;
    weight[i] = 0.75 + rng() * 0.5;
    baseScale[i] = scale;
    idleColors[i * 3] = idle.r;
    idleColors[i * 3 + 1] = idle.g;
    idleColors[i * 3 + 2] = idle.b;
    activeColors[i * 3] = active.r;
    activeColors[i * 3 + 1] = active.g;
    activeColors[i * 3 + 2] = active.b;
    i++;
  };

  // Layer 0 — input column.
  layerStart.push(i);
  layerCount.push(INPUT_COUNT);
  for (let k = 0; k < INPUT_COUNT; k++) {
    c.copy(COL_IDLE_A).lerp(COL_IDLE_B, rng());
    put(
      0,
      LAYER_X[0],
      -2.1 + (k * 4.2) / (INPUT_COUNT - 1),
      0,
      0.11,
      c,
      rng() < 0.3 ? COL_TERRA_LIGHT : COL_TERRA
    );
  }

  // Layers 1..4 — hidden rings/discs (in the y/z plane, z compressed).
  for (let L = 1; L <= 4; L++) {
    layerStart.push(i);
    layerCount.push(HIDDEN_COUNT);
    for (let k = 0; k < HIDDEN_COUNT; k++) {
      const a = rng() * Math.PI * 2;
      const r = RING_RADIUS * Math.sqrt(0.2 + 0.8 * rng());
      c.copy(COL_IDLE_A).lerp(COL_IDLE_B, rng());
      put(
        L,
        LAYER_X[L] + (rng() - 0.5) * 0.3,
        Math.cos(a) * r,
        Math.sin(a) * r * 0.55 + (rng() - 0.5) * 0.4,
        0.07 + rng() * 0.035,
        c,
        rng() < 0.3 ? COL_TERRA_LIGHT : COL_TERRA
      );
    }
  }

  // Layer 5 — output column (occasional blue tint on activation).
  layerStart.push(i);
  layerCount.push(OUTPUT_COUNT);
  const blueOut = COL_TERRA.clone().lerp(COL_BLUE, 0.65);
  for (let k = 0; k < OUTPUT_COUNT; k++) {
    c.copy(COL_IDLE_A).lerp(COL_IDLE_B, rng());
    put(
      5,
      LAYER_X[5],
      -1.6 + (k * 3.2) / (OUTPUT_COUNT - 1),
      0,
      0.12,
      c,
      rng() < 0.5 ? blueOut : COL_TERRA
    );
  }

  // Vault cluster — teal-tinted, lower-left.
  layerStart.push(i);
  layerCount.push(VAULT_COUNT);
  const vaultIdle = COL_IDLE_A.clone().lerp(COL_TEAL, 0.4);
  for (let k = 0; k < VAULT_COUNT; k++) {
    put(
      VAULT_LAYER,
      VAULT_CENTER.x + (rng() - 0.5) * 1.1,
      VAULT_CENTER.y + (rng() - 0.5) * 0.9,
      VAULT_CENTER.z + (rng() - 0.5) * 0.8,
      0.09 + rng() * 0.02,
      vaultIdle,
      COL_TEAL
    );
  }

  // Edges — sparse random segments per adjacent layer pair + vault→hidden1.
  const segCount = EDGES_PER_PAIR * 5 + VAULT_EDGES;
  const edgePositions = new Float32Array(segCount * 6);
  const edgeColors = new Float32Array(segCount * 6);
  const edgePair = new Uint8Array(segCount);

  const pick = (layer: number) =>
    layerStart[layer] + Math.floor(rng() * layerCount[layer]);

  let s = 0;
  const addSegment = (a: number, b: number, pair: number) => {
    const o = s * 6;
    edgePositions[o] = positions[a * 3];
    edgePositions[o + 1] = positions[a * 3 + 1];
    edgePositions[o + 2] = positions[a * 3 + 2];
    edgePositions[o + 3] = positions[b * 3];
    edgePositions[o + 4] = positions[b * 3 + 1];
    edgePositions[o + 5] = positions[b * 3 + 2];
    const idle = pair === 5 ? EDGE_IDLE_VAULT : EDGE_IDLE;
    for (let v = 0; v < 2; v++) {
      edgeColors[o + v * 3] = idle.r;
      edgeColors[o + v * 3 + 1] = idle.g;
      edgeColors[o + v * 3 + 2] = idle.b;
    }
    edgePair[s] = pair;
    s++;
  };

  for (let p = 0; p < 5; p++) {
    for (let k = 0; k < EDGES_PER_PAIR; k++) {
      addSegment(pick(p), pick(p + 1), p);
    }
  }
  for (let k = 0; k < VAULT_EDGES; k++) {
    addSegment(pick(6), pick(1), 5); // vault → hidden layer 1
  }

  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(edgePositions, 3)
  );
  const edgeColorAttr = new THREE.BufferAttribute(edgeColors, 3);
  edgeColorAttr.setUsage(THREE.DynamicDrawUsage);
  edgeGeometry.setAttribute("color", edgeColorAttr);

  return {
    count,
    positions,
    layerOf,
    weight,
    baseScale,
    idleColors,
    activeColors,
    edgeGeometry,
    edgeColorAttr,
    edgePair,
    segCount,
  };
}

// ---------------------------------------------------------------------------
// Scene — all per-frame mutation lives here.
// ---------------------------------------------------------------------------

function Scene({ pulseRef, retrievalRef, phase, reduced }: NeuralFieldProps) {
  const net = useMemo(buildNetwork, []);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);

  // Pulse queue + last-seen counters (lazy-initialized to the mount values so
  // pre-existing counts don't fire a burst on open).
  const pulses = useRef<Pulse[]>([]);
  const seen = useRef({
    token: pulseRef.current,
    retrieval: retrievalRef.current,
    lastTokenAt: -1,
    lastRetrievalAt: -1,
  });
  const phaseRef = useRef<GlassPhase>(phase);
  const prevPhase = useRef<GlassPhase>(phase);
  const parallax = useRef({ x: 0, y: 0 });

  // Per-layer activation scratch (indices 0..5 = layers, 6 = vault).
  const actTok = useRef(new Float32Array(7)).current;
  const actRet = useRef(new Float32Array(7)).current;
  const pairCol = useRef(new Float32Array(6 * 3)).current;

  const pushPulse = (kind: PulseKind, t0: number) => {
    const q = pulses.current;
    if (q.length >= QUEUE_CAP) q.shift();
    q.push({ t0, kind });
  };

  // Phase transitions: entering eval (or jumping straight to done) fires one
  // soft teal full-network sweep.
  useEffect(() => {
    const prev = prevPhase.current;
    prevPhase.current = phase;
    phaseRef.current = phase;
    if (reduced) return;
    const sweep =
      (phase === "eval" && prev !== "eval") ||
      (phase === "done" && prev !== "eval" && prev !== "done");
    if (sweep) pushPulse("sweep", performance.now() * 0.001);
  }, [phase, reduced]);

  // Initial (and reduced-mode) static pass: place every instance, set idle
  // colors, request one frame. The animated loop overwrites this each frame.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let n = 0; n < net.count; n++) {
      const s = net.baseScale[n];
      TMP_M.makeScale(s, s, s);
      TMP_M.setPosition(
        net.positions[n * 3],
        net.positions[n * 3 + 1],
        net.positions[n * 3 + 2]
      );
      mesh.setMatrixAt(n, TMP_M);
      TMP_C.setRGB(
        net.idleColors[n * 3],
        net.idleColors[n * 3 + 1],
        net.idleColors[n * 3 + 2]
      );
      mesh.setColorAt(n, TMP_C);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [net, invalidate]);

  useFrame((state) => {
    if (reduced) return;
    const mesh = meshRef.current;
    if (!mesh) return;
    const now = performance.now() * 0.001;
    const q = pulses.current;

    // --- Ingest real signals (diff counters; coalesce bursts). ------------
    if (pulseRef.current !== seen.current.token) {
      if (now - seen.current.lastTokenAt >= MIN_TOKEN_GAP) {
        pushPulse("token", now);
        seen.current.lastTokenAt = now;
        seen.current.token = pulseRef.current;
      }
      // else: leave counter un-consumed so the pulse fires next window.
    }
    if (retrievalRef.current !== seen.current.retrieval) {
      if (now - seen.current.lastRetrievalAt >= MIN_RETRIEVAL_GAP) {
        pushPulse("retrieval", now);
        seen.current.lastRetrievalAt = now;
        seen.current.retrieval = retrievalRef.current;
      }
    }

    // --- Expire dead pulses in place (no allocation). ----------------------
    let w = 0;
    for (let k = 0; k < q.length; k++) {
      const ttl = q[k].kind === "sweep" ? SWEEP_TTL : PULSE_TTL;
      if (now - q[k].t0 < ttl) q[w++] = q[k];
    }
    q.length = w;

    // --- Per-layer activations. --------------------------------------------
    actTok.fill(0);
    actRet.fill(0);
    for (let k = 0; k < q.length; k++) {
      const e = now - q[k].t0;
      const kind = q[k].kind;
      if (kind === "token") {
        for (let L = 0; L < 6; L++) actTok[L] += gauss(e - L * LAYER_DELAY);
      } else if (kind === "retrieval") {
        actRet[6] += gauss(e); // vault flashes first…
        for (let L = 1; L < 6; L++)
          actRet[L] += 0.95 * gauss(e - L * LAYER_DELAY); // …then propagates
      } else {
        actRet[6] += 0.35 * gaussSweep(e);
        for (let L = 0; L < 6; L++)
          actRet[L] += 0.55 * gaussSweep(e - L * SWEEP_DELAY);
      }
    }

    // Ambient shimmer while resting (idle/tokenize and after eval/done).
    const ph = phaseRef.current;
    if (ph === "idle" || ph === "tokenize" || ph === "eval" || ph === "done") {
      for (let L = 0; L < 6; L++)
        actTok[L] += 0.04 + 0.04 * Math.sin(now * 0.9 - L * 0.85);
      actRet[6] += 0.03 + 0.03 * Math.sin(now * 0.7 + 2.1);
    }
    for (let L = 0; L < 7; L++) {
      actTok[L] = Math.min(1, actTok[L]);
      actRet[L] = Math.min(1, actRet[L]);
    }

    // --- Nodes: per-instance scale + color. --------------------------------
    for (let n = 0; n < net.count; n++) {
      const L = net.layerOf[n];
      const aT = Math.min(1, actTok[L] * net.weight[n]);
      const aR = Math.min(1, actRet[L] * net.weight[n]);
      const act = Math.min(1, aT + aR);
      const s = net.baseScale[n] * (1 + 1.1 * act);
      TMP_M.makeScale(s, s, s);
      TMP_M.setPosition(
        net.positions[n * 3],
        net.positions[n * 3 + 1],
        net.positions[n * 3 + 2]
      );
      mesh.setMatrixAt(n, TMP_M);

      TMP_C.setRGB(
        net.idleColors[n * 3],
        net.idleColors[n * 3 + 1],
        net.idleColors[n * 3 + 2]
      );
      if (aT > 0.004) {
        TMP_C2.setRGB(
          net.activeColors[n * 3],
          net.activeColors[n * 3 + 1],
          net.activeColors[n * 3 + 2]
        );
        TMP_C.lerp(TMP_C2, aT);
      }
      if (aR > 0.004) TMP_C.lerp(COL_TEAL, aR);
      mesh.setColorAt(n, TMP_C);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // --- Edges: one color per layer pair, written to vertex colors. --------
    for (let p = 0; p < 6; p++) {
      let aT = 0;
      let aR = 0;
      if (p === 5) {
        aR = Math.max(actRet[6], actRet[1]);
      } else {
        aT = Math.max(actTok[p], actTok[p + 1]);
        aR = Math.max(actRet[p], actRet[p + 1]);
      }
      TMP_C.copy(p === 5 ? EDGE_IDLE_VAULT : EDGE_IDLE);
      if (aT > 0.004) TMP_C.lerp(EDGE_TOKEN, aT * 0.9);
      if (aR > 0.004) TMP_C.lerp(EDGE_TEAL, aR * 0.9);
      pairCol[p * 3] = TMP_C.r;
      pairCol[p * 3 + 1] = TMP_C.g;
      pairCol[p * 3 + 2] = TMP_C.b;
    }
    const colors = net.edgeColorAttr.array as Float32Array;
    for (let seg = 0; seg < net.segCount; seg++) {
      const p3 = net.edgePair[seg] * 3;
      const o = seg * 6;
      colors[o] = pairCol[p3];
      colors[o + 1] = pairCol[p3 + 1];
      colors[o + 2] = pairCol[p3 + 2];
      colors[o + 3] = pairCol[p3];
      colors[o + 4] = pairCol[p3 + 1];
      colors[o + 5] = pairCol[p3 + 2];
    }
    net.edgeColorAttr.needsUpdate = true;

    // --- Camera: slow orbital drift + eased cursor parallax. ---------------
    const cam = state.camera;
    parallax.current.x += (pointer.x * 0.7 - parallax.current.x) * 0.04;
    parallax.current.y += (-pointer.y * 0.45 - parallax.current.y) * 0.04;
    cam.position.x = Math.sin(now * 0.11) * 0.4 + parallax.current.x;
    cam.position.y = 0.5 + Math.cos(now * 0.13) * 0.22 + parallax.current.y;
    cam.position.z = 11;
    cam.lookAt(0, 0, 0);
  });

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, net.count]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <lineSegments geometry={net.edgeGeometry} frustumCulled={false}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Error boundary — the overlay must never crash (WebGL unavailable etc).
// ---------------------------------------------------------------------------

class FieldBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // Swallow — the overlay simply omits the 3D field.
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Public component.
// ---------------------------------------------------------------------------

export default function NeuralField(props: NeuralFieldProps) {
  usePointerTracking(!props.reduced);

  return (
    <FieldBoundary>
      <Canvas
        dpr={[1, 1.5]}
        frameloop={props.reduced ? "demand" : "always"}
        camera={{ position: [0, 0.5, 11], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        flat
        style={{ width: "100%", height: "100%", background: "transparent" }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <AdaptiveDpr />
        <Scene {...props} />
      </Canvas>
    </FieldBoundary>
  );
}
