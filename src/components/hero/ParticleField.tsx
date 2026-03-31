"use client";

import { useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

type Phase = "drift" | "forming" | "holding" | "dispersing";

// ---------------------------------------------------------------------------
// Constants (no allocations at runtime)
// ---------------------------------------------------------------------------

const PARTICLE_COUNT = 600;
const FORM_SPRING = 0.04;
const FORM_DAMPING = 0.88;
const DRIFT_SPEED = 0.3;
const DISPERSE_SPEED = 0.15;
const HOLD_DURATION_MS = 2000;
const FORM_DELAY_MS = 2000;
const GLYPH_TEXT = "DHRUV";
const GLYPH_FONT = "bold 160px Inter, Arial, sans-serif";
const SAMPLE_STEP = 3; // pixel sampling density for glyph

const COLORS = [
  "rgba(124, 58, 237, A)", // --accent
  "rgba(167, 139, 250, A)", // --accent-light
  "rgba(192, 132, 252, A)", // --accent-lighter
  "rgba(242, 242, 242, A)", // --text-primary (white)
  "rgba(161, 161, 170, A)", // --text-secondary
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

/**
 * Render text to an offscreen canvas, sample lit pixels, return coordinate list
 * scaled to center within the given viewport dimensions.
 */
function sampleGlyphTargets(
  text: string,
  viewW: number,
  viewH: number
): { x: number; y: number }[] {
  const offscreen = document.createElement("canvas");
  const ctx = offscreen.getContext("2d")!;

  // Measure text to determine canvas size
  ctx.font = GLYPH_FONT;
  const metrics = ctx.measureText(text);
  const textW = Math.ceil(metrics.width);
  const textH = 160; // approximate height based on font size

  offscreen.width = textW + 40;
  offscreen.height = textH + 40;

  ctx.font = GLYPH_FONT;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "top";
  ctx.fillText(text, 20, 20);

  const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
  const pixels = imageData.data;
  const points: { x: number; y: number }[] = [];

  for (let y = 0; y < offscreen.height; y += SAMPLE_STEP) {
    for (let x = 0; x < offscreen.width; x += SAMPLE_STEP) {
      const i = (y * offscreen.width + x) * 4;
      if (pixels[i + 3] > 128) {
        points.push({ x, y });
      }
    }
  }

  // Scale and center the sampled points into the viewport
  const offsetX = (viewW - offscreen.width) / 2;
  const offsetY = (viewH - offscreen.height) / 2;

  return points.map((p) => ({
    x: p.x + offsetX,
    y: p.y + offsetY,
  }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const phaseRef = useRef<Phase>("drift");
  const phaseTimerRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const targetsRef = useRef<{ x: number; y: number }[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const startTimeRef = useRef<number>(0);
  const scrollTriggeredRef = useRef(false);

  // -----------------------------------------------------------------------
  // Initialize particles
  // -----------------------------------------------------------------------
  const initParticles = useCallback((w: number, h: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = randomBetween(0, w);
      const y = randomBetween(0, h);
      particles.push({
        x,
        y,
        targetX: 0,
        targetY: 0,
        originX: x,
        originY: y,
        vx: randomBetween(-DRIFT_SPEED, DRIFT_SPEED),
        vy: randomBetween(-DRIFT_SPEED, DRIFT_SPEED),
        radius: randomBetween(1, 2),
        color: pickColor(),
        alpha: randomBetween(0.3, 0.8),
      });
    }
    particlesRef.current = particles;
  }, []);

  // -----------------------------------------------------------------------
  // Assign glyph targets to particles
  // -----------------------------------------------------------------------
  const assignTargets = useCallback(() => {
    const targets = targetsRef.current;
    const particles = particlesRef.current;
    if (targets.length === 0) return;

    for (let i = 0; i < particles.length; i++) {
      const t = targets[i % targets.length];
      particles[i].targetX = t.x;
      particles[i].targetY = t.y;
    }
  }, []);

  // -----------------------------------------------------------------------
  // Transition to forming phase
  // -----------------------------------------------------------------------
  const startForming = useCallback(() => {
    if (phaseRef.current !== "drift") return;
    const w = sizeRef.current.w;
    const h = sizeRef.current.h;
    targetsRef.current = sampleGlyphTargets(GLYPH_TEXT, w, h);
    assignTargets();
    phaseRef.current = "forming";
  }, [assignTargets]);

  // -----------------------------------------------------------------------
  // Main animation loop (zero allocations)
  // -----------------------------------------------------------------------
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = sizeRef.current.w;
    const h = sizeRef.current.h;
    const particles = particlesRef.current;
    const phase = phaseRef.current;
    const now = performance.now();

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Auto-trigger forming after delay
    if (
      phase === "drift" &&
      !scrollTriggeredRef.current &&
      now - startTimeRef.current > FORM_DELAY_MS
    ) {
      startForming();
    }

    let allSettled = true;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      if (phase === "drift") {
        // Free drift
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      } else if (phase === "forming" || phase === "holding") {
        // Spring physics toward target
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        p.vx += dx * FORM_SPRING;
        p.vy += dy * FORM_SPRING;
        p.vx *= FORM_DAMPING;
        p.vy *= FORM_DAMPING;
        p.x += p.vx;
        p.y += p.vy;

        if (phase === "forming") {
          const dist = dx * dx + dy * dy;
          if (dist > 1) allSettled = false;
        }
      } else if (phase === "dispersing") {
        // Slow drift away from formation
        p.vx += (Math.random() - 0.5) * DISPERSE_SPEED * 0.1;
        p.vy += (Math.random() - 0.5) * DISPERSE_SPEED * 0.1;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }

      // Draw particle
      const colorWithAlpha = p.color.replace("A", String(p.alpha));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = colorWithAlpha;
      ctx.fill();
    }

    // Phase transitions
    if (phase === "forming" && allSettled) {
      phaseRef.current = "holding";
      phaseTimerRef.current = now;
    }

    if (
      phase === "holding" &&
      now - phaseTimerRef.current > HOLD_DURATION_MS
    ) {
      // Kick particles with random dispersal velocity
      for (let i = 0; i < particles.length; i++) {
        particles[i].vx = randomBetween(-DISPERSE_SPEED, DISPERSE_SPEED);
        particles[i].vy = randomBetween(-DISPERSE_SPEED, DISPERSE_SPEED);
      }
      phaseRef.current = "dispersing";
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [startForming]);

  // -----------------------------------------------------------------------
  // Setup
  // -----------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      sizeRef.current = { w, h };
    };

    setSize();
    initParticles(sizeRef.current.w, sizeRef.current.h);
    startTimeRef.current = performance.now();

    // Scroll trigger — form on first scroll
    const onScroll = () => {
      if (!scrollTriggeredRef.current && phaseRef.current === "drift") {
        scrollTriggeredRef.current = true;
        startForming();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", setSize, { passive: true });

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", setSize);
    };
  }, [animate, initParticles, startForming]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0"
      style={{ width: "100%", height: "100%" }}
      aria-hidden="true"
    />
  );
}
