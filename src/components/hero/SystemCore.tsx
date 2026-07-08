"use client";

/**
 * SystemCore — a contained, abstract "distributed system" core.
 *
 * A slowly auto-rotating wireframe icosahedron wrapped by a small cluster of
 * orbiting nodes + edges, rendered in terracotta + off-white on a transparent
 * background. No lights — a matcap material keeps it cheap. Rendering pauses
 * when the canvas leaves the viewport, and the whole scene tilts subtly toward
 * the pointer by mutating refs inside useFrame (never via React state).
 *
 * Mount this ONLY on desktop + when motion is allowed. The hero handles the
 * static fallback (memoji poster) for mobile / reduced-motion.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Icosahedron } from "@react-three/drei";
import * as THREE from "three";

const ACCENT = "#E8845C"; // terracotta
const OFF_WHITE = "#ECECEF"; // text-primary
const NODE_COUNT = 7;

// ---------------------------------------------------------------------------
// Pointer parallax — module-scoped, written from a window listener, read in
// useFrame. Kept out of React state so it never triggers re-renders.
// ---------------------------------------------------------------------------

const pointer = { x: 0, y: 0 };

function usePointerTracking(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      // Normalize to -1..1 relative to viewport center.
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled]);
}

// ---------------------------------------------------------------------------
// Orbiting node cluster — stylized peers around the core.
// ---------------------------------------------------------------------------

interface NodeDef {
  position: THREE.Vector3;
  scale: number;
}

function useNodes(): NodeDef[] {
  return useMemo(() => {
    const nodes: NodeDef[] = [];
    // Distribute on a fibonacci sphere for an even, intentional spread.
    const golden = Math.PI * (3 - Math.sqrt(5));
    const radius = 2.05;
    for (let i = 0; i < NODE_COUNT; i++) {
      const y = 1 - (i / (NODE_COUNT - 1)) * 2; // 1..-1
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      nodes.push({
        position: new THREE.Vector3(
          Math.cos(theta) * r * radius,
          y * radius,
          Math.sin(theta) * r * radius
        ),
        scale: 0.07 + (i % 3) * 0.018,
      });
    }
    return nodes;
  }, []);
}

// ---------------------------------------------------------------------------
// Core group — wireframe icosahedron + nodes + connecting edges.
// ---------------------------------------------------------------------------

function CoreGroup({ active }: { active: boolean }) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);
  const nodes = useNodes();

  // Matcap-style shading via a cheap, light-free material baked from a
  // gradient texture so we avoid loading external matcap assets.
  const matcap = useMemo(() => makeMatcapTexture(ACCENT), []);

  // Edges from each node back to the core center — the "system" topology.
  const edges = useMemo(() => {
    const positions: number[] = [];
    for (const n of nodes) {
      positions.push(0, 0, 0, n.position.x, n.position.y, n.position.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    return geo;
  }, [nodes]);

  // Parallax state lives on refs so useFrame can ease toward pointer targets
  // without ever touching React state.
  const tilt = useRef({ x: 0, z: 0 });

  useFrame((_, delta) => {
    if (!active) return;
    const d = Math.min(delta, 0.05); // clamp for stability on frame drops
    if (group.current) {
      // Steady, slow auto-rotation (authoritative on Y).
      group.current.rotation.y += d * 0.18;

      // Subtle parallax toward the pointer — eased tilt + drift.
      tilt.current.x += (pointer.y * 0.18 - tilt.current.x) * 0.05;
      tilt.current.z += (-pointer.x * 0.14 - tilt.current.z) * 0.05;
      group.current.rotation.x = tilt.current.x + d * 0; // tilt only on X
      group.current.rotation.z = tilt.current.z;

      group.current.position.x +=
        (pointer.x * 0.22 - group.current.position.x) * 0.04;
      group.current.position.y +=
        (-pointer.y * 0.16 - group.current.position.y) * 0.04;
    }
    if (inner.current) {
      inner.current.rotation.y -= d * 0.12;
      inner.current.rotation.z += d * 0.04;
    }
  });

  return (
    <group ref={group}>
      {/* Outer wireframe shell — the system boundary */}
      <Icosahedron args={[1.55, 1]}>
        <meshBasicMaterial
          color={ACCENT}
          wireframe
          transparent
          opacity={0.5}
        />
      </Icosahedron>

      {/* Inner solid core — off-white, matcap-shaded (no scene lights) */}
      <mesh ref={inner}>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshMatcapMaterial color={OFF_WHITE} matcap={matcap} flatShading />
      </mesh>

      {/* Connecting edges (core → nodes) */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial
          color={ACCENT}
          transparent
          opacity={0.28}
        />
      </lineSegments>

      {/* Orbiting nodes */}
      {nodes.map((n, i) => (
        <mesh key={i} position={n.position}>
          <sphereGeometry args={[n.scale, 16, 16]} />
          <meshBasicMaterial color={i % 2 === 0 ? ACCENT : OFF_WHITE} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Render gate — pauses the r3f loop when the canvas is offscreen.
// ---------------------------------------------------------------------------

function RenderGate({ active }: { active: boolean }) {
  const { invalidate } = useThree();
  useFrame(() => {
    // With frameloop="demand", request the next frame only while active.
    if (active) invalidate();
  });
  return null;
}

// ---------------------------------------------------------------------------
// Public component.
// ---------------------------------------------------------------------------

export function SystemCore({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  usePointerTracking(inView);

  // Pause the scene when scrolled out of view (CPU saver).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={inView ? "always" : "demand"}
        camera={{ position: [0, 0, 6], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <RenderGate active={inView} />
        <Float
          speed={inView ? 1.3 : 0}
          rotationIntensity={0.25}
          floatIntensity={0.6}
        >
          <CoreGroup active={inView} />
        </Float>
      </Canvas>
    </div>
  );
}

export default SystemCore;

// ---------------------------------------------------------------------------
// Cheap procedural matcap — a radial gradient baked to a canvas texture.
// Gives the inner core a soft, lit-looking sheen without any scene lights.
// ---------------------------------------------------------------------------

function makeMatcapTexture(tint: string): THREE.Texture {
  if (typeof document === "undefined") {
    return new THREE.Texture();
  }
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Base dark ground.
  ctx.fillStyle = "#0D0D10";
  ctx.fillRect(0, 0, size, size);

  // Off-white highlight, upper-left (classic matcap key light).
  const hi = ctx.createRadialGradient(
    size * 0.34,
    size * 0.32,
    2,
    size * 0.5,
    size * 0.5,
    size * 0.62
  );
  hi.addColorStop(0, "#FFFFFF");
  hi.addColorStop(0.45, "#D7D7DC");
  hi.addColorStop(1, "rgba(13,13,16,0)");
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Warm terracotta rim, lower-right.
  const rim = ctx.createRadialGradient(
    size * 0.72,
    size * 0.74,
    2,
    size * 0.5,
    size * 0.5,
    size * 0.6
  );
  rim.addColorStop(0, tint);
  rim.addColorStop(0.5, "rgba(232,132,92,0.25)");
  rim.addColorStop(1, "rgba(13,13,16,0)");
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
