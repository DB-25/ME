"use client";

import { useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { SignalField, type FieldQuality } from "./SignalField";

const ORBIT_SPEED = 0.11;
const ORBIT_YAW = 0.16;
const ORBIT_PITCH = 0.05;
const PARALLAX = 0.45;

/** Slow idle orbit plus mouse parallax. Nothing allocates per frame. */
function CameraRig({ reducedMotion, coarse }: { reducedMotion: boolean; coarse: boolean }) {
  const camera = useThree((s) => s.camera);
  const state = useThree((s) => s.size);
  const pointer = useThreePointer(reducedMotion || coarse);

  useFrame((frame, delta) => {
    if (reducedMotion) {
      camera.position.x = 0;
      camera.position.y = 0;
      camera.lookAt(0, 0, 0);
      return;
    }
    const t = frame.clock.elapsedTime;
    const dist = camera.position.z;
    const k = Math.min(1, Math.min(delta, 0.25) * 3);
    pointer.sx += (pointer.x - pointer.sx) * k;
    pointer.sy += (pointer.y - pointer.sy) * k;
    const yaw = Math.sin(t * ORBIT_SPEED) * ORBIT_YAW + pointer.sx * 0.12;
    const pitch = Math.sin(t * ORBIT_SPEED * 0.7 + 1.3) * ORBIT_PITCH + pointer.sy * 0.06;
    camera.position.x = Math.sin(yaw) * dist + pointer.sx * PARALLAX * 0.3;
    camera.position.y = Math.sin(pitch) * dist + pointer.sy * PARALLAX * 0.3;
    camera.lookAt(0, 0, 0);
  });
  void state;
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
    if (++frames.n >= 3) {
      frames.done = true;
      onFrame();
    }
  });
  return null;
}

function FpsProbe() {
  const [probe] = useState(() => ({ frames: 0, last: performance.now() }));
  useFrame(() => {
    probe.frames++;
    const now = performance.now();
    if (now - probe.last >= 500) {
      (window as unknown as { __signalFps?: number }).__signalFps = Math.round((probe.frames * 1000) / (now - probe.last));
      probe.frames = 0;
      probe.last = now;
    }
  });
  return null;
}

export default function SignalCanvas({ quality, onReady }: { quality: FieldQuality; onReady: () => void }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => setHidden(document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={hidden ? "never" : "always"}
      flat
      camera={{ fov: 38, near: 0.1, far: 80, position: [0, 0, 7] }}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false, stencil: false, depth: false }}
      style={{ position: "absolute", inset: 0 }}
      events={undefined}
    >
      <color attach="background" args={["#060509"]} />
      <SignalField quality={quality} />
      <CameraRig reducedMotion={quality.reducedMotion} coarse={quality.coarse} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={quality.coarse ? 0.55 : 0.65} luminanceThreshold={0.3} luminanceSmoothing={0.5} radius={0.7} />
        <ToneMapping mode={ToneMappingMode.REINHARD} />
        <Vignette eskil={false} offset={0.28} darkness={0.7} />
      </EffectComposer>
      <FirstFrame onFrame={onReady} />
      <FpsProbe />
    </Canvas>
  );
}
