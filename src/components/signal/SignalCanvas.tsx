"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode, type BloomEffect } from "postprocessing";
import { signalStore } from "@/lib/signal-store";
import { SignalField, type FieldQuality } from "./SignalField";
import { CHAPTER_BLOOM, DEFAULT_BLOOM, OVERRIDE_BLOOM } from "./look";

const ORBIT_SPEED = 0.11;
const ORBIT_YAW = 0.16;
const ORBIT_PITCH = 0.05;
const PARALLAX = 0.45;
const BLOOM_BASE = 0.65;
const BLOOM_FOLLOW_RATE = 4;
const BLOOM_SETTLED = 0.002;
const MAX_DT = 0.25;
const FIRST_FRAMES = 3;

/** Slow idle orbit plus mouse parallax; bloom eases per chapter. Nothing allocates per frame. */
function CameraRig({ reducedMotion, coarse, bloom }: { reducedMotion: boolean; coarse: boolean; bloom: React.RefObject<BloomEffect | null> }) {
  const camera = useThree((s) => s.camera);
  const [bloomScale] = useState({ w: 1 });
  const pointer = useThreePointer(reducedMotion || coarse);

  useFrame((frame, delta) => {
    const sig = signalStore.getState();
    const drawing = sig.override?.kind === "points";
    const bloomTarget = drawing ? OVERRIDE_BLOOM : (CHAPTER_BLOOM[sig.chapter] ?? DEFAULT_BLOOM);
    bloomScale.w += (bloomTarget - bloomScale.w) * Math.min(1, Math.min(delta, MAX_DT) * BLOOM_FOLLOW_RATE);
    if (bloom.current) bloom.current.intensity = BLOOM_BASE * bloomScale.w;
    // On-demand rendering must not stall halfway through an ease.
    if (Math.abs(bloomTarget - bloomScale.w) > BLOOM_SETTLED) frame.invalidate();

    if (reducedMotion) {
      camera.position.x = 0;
      camera.position.y = 0;
      camera.lookAt(0, 0, 0);
      return;
    }
    const t = frame.clock.elapsedTime;
    const dist = camera.position.z;
    const k = Math.min(1, Math.min(delta, MAX_DT) * 3);
    pointer.sx += (pointer.x - pointer.sx) * k;
    pointer.sy += (pointer.y - pointer.sy) * k;
    const yaw = Math.sin(t * ORBIT_SPEED) * ORBIT_YAW + pointer.sx * 0.12;
    const pitch = Math.sin(t * ORBIT_SPEED * 0.7 + 1.3) * ORBIT_PITCH + pointer.sy * 0.06;
    camera.position.x = Math.sin(yaw) * dist + pointer.sx * PARALLAX * 0.3;
    camera.position.y = Math.sin(pitch) * dist + pointer.sy * PARALLAX * 0.3;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function useThreePointer(disabled: boolean) {
  const [p] = useState(() => ({ x: 0, y: 0, sx: 0, sy: 0 }));
  useEffect(() => {
    if (disabled) return;
    const move = (e: PointerEvent) => {
      p.x = (e.clientX / window.innerWidth) * 2 - 1;
      p.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [disabled, p]);
  return p;
}

/** Flags the first rendered frames so the wrapper can fade the canvas in. */
function FirstFrame({ onFrame }: { onFrame: () => void }) {
  const [frames] = useState({ n: 0, done: false });
  useFrame(() => {
    if (frames.done) return;
    if (++frames.n >= FIRST_FRAMES) {
      frames.done = true;
      onFrame();
    }
  });
  return null;
}

/** Restarts the on-demand loop when a pause lifts. */
function Wake({ paused }: { paused: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!paused) invalidate();
  }, [paused, invalidate]);
  return null;
}

type Props = { quality: FieldQuality; onReady: () => void; onContextLost: () => void; onContextRestored: () => void };

export default function SignalCanvas({ quality, onReady, onContextLost, onContextRestored }: Props) {
  const [hidden, setHidden] = useState(false);
  const [lost, setLost] = useState(false);
  const bloomRef = useRef<BloomEffect>(null);
  const paused = hidden || lost;

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return (
    <Canvas
      dpr={[1, quality.maxDpr]}
      frameloop={paused ? "never" : "demand"}
      flat
      camera={{ fov: 38, near: 0.1, far: 80, position: [0, 0, 7] }}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false, stencil: false, depth: false }}
      style={{ position: "absolute", inset: 0 }}
      events={undefined}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        // preventDefault asks the browser to restore the context; until it does the CSS glow shows through.
        canvas.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          setLost(true);
          onContextLost();
        });
        canvas.addEventListener("webglcontextrestored", () => {
          setLost(false);
          onContextRestored();
        });
      }}
    >
      <color attach="background" args={["#060509"]} />
      <SignalField quality={quality} />
      <CameraRig reducedMotion={quality.reducedMotion} coarse={quality.coarse} bloom={bloomRef} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom ref={bloomRef} mipmapBlur intensity={BLOOM_BASE} luminanceThreshold={0.3} luminanceSmoothing={0.5} radius={0.7} />
        <ToneMapping mode={ToneMappingMode.REINHARD} />
        <Vignette eskil={false} offset={0.28} darkness={0.7} />
      </EffectComposer>
      <FirstFrame onFrame={onReady} />
      <Wake paused={paused} />
    </Canvas>
  );
}
