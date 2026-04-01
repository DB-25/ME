"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type {
  PreparedTextWithSegments,
  LayoutCursor,
} from "@chenglou/pretext";

interface Line {
  text: string;
  x: number;
  y: number;
  width: number;
  font: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAME = "Dhruv Kamalesh Kumar";
const TAGLINE = "Building AI that actually ships.";
const SUBTITLE = "Gen AI Engineer at the Burnes Center for Social Change";

const NAME_FONT_WEIGHT = "700";
const TAGLINE_FONT_WEIGHT = "400";
const SUBTITLE_FONT_WEIGHT = "400";
const FONT_FAMILY = '"Inter", system-ui, -apple-system, sans-serif';

// Memoji obstacle config
const MEMOJI_SIZE_RATIO = 0.22; // % of viewport width on desktop
const MEMOJI_MIN = 120;
const MEMOJI_MAX = 220;
const MEMOJI_PADDING = 24; // breathing room around image

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampFont(vwRatio: number, min: number, max: number, vw: number) {
  return Math.min(max, Math.max(min, vw * vwRatio));
}

function getLayout(vw: number, vh: number) {
  const isMobile = vw < 640;
  const isTablet = vw >= 640 && vw < 1024;

  const nameSize = isMobile
    ? clampFont(0.1, 32, 48, vw)
    : isTablet
      ? clampFont(0.07, 40, 56, vw)
      : clampFont(0.055, 48, 72, vw);

  const taglineSize = isMobile
    ? clampFont(0.045, 16, 22, vw)
    : clampFont(0.022, 18, 28, vw);

  const subtitleSize = isMobile
    ? clampFont(0.035, 13, 16, vw)
    : clampFont(0.014, 14, 18, vw);

  const memojiSize = isMobile
    ? 0 // no obstacle on mobile — just show below
    : Math.min(MEMOJI_MAX, Math.max(MEMOJI_MIN, vw * MEMOJI_SIZE_RATIO));

  const lineHeightName = nameSize * 1.15;
  const lineHeightTagline = taglineSize * 1.5;
  const lineHeightSubtitle = subtitleSize * 1.5;

  // Content area
  const padX = isMobile ? 24 : isTablet ? 48 : Math.max(64, vw * 0.08);
  const contentW = vw - padX * 2;

  // Memoji position: right-aligned, vertically centered in name block
  const memojiX = isMobile ? 0 : contentW - memojiSize;
  const memojiY = isMobile ? 0 : 0; // will offset from text start

  return {
    isMobile,
    padX,
    contentW,
    nameSize,
    taglineSize,
    subtitleSize,
    lineHeightName,
    lineHeightTagline,
    lineHeightSubtitle,
    memojiSize,
    memojiX,
    memojiY,
    vh,
    vw,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PretextHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const memojiRef = useRef<HTMLImageElement | null>(null);
  const pretextRef = useRef<typeof import("@chenglou/pretext") | null>(null);
  const [loaded, setLoaded] = useState(false);
  const rafRef = useRef<number>(0);
  const fadeRef = useRef(0); // 0→1 opacity fade-in

  // Load pretext + memoji in parallel
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [mod, img] = await Promise.all([
        import("@chenglou/pretext"),
        new Promise<HTMLImageElement>((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = "/memoji.png";
        }),
      ]);

      if (cancelled) return;
      pretextRef.current = mod;
      memojiRef.current = img;
      setLoaded(true);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Main render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const pretext = pretextRef.current;
    const memoji = memojiRef.current;
    if (!canvas || !pretext) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, vw, vh);

    const L = getLayout(vw, vh);

    const nameFont = `${NAME_FONT_WEIGHT} ${L.nameSize}px ${FONT_FAMILY}`;
    const taglineFont = `${TAGLINE_FONT_WEIGHT} ${L.taglineSize}px ${FONT_FAMILY}`;
    const subtitleFont = `${SUBTITLE_FONT_WEIGHT} ${L.subtitleSize}px ${FONT_FAMILY}`;

    // Prepare text with Pretext
    const namePrepared = pretext.prepareWithSegments(NAME, nameFont);
    const taglinePrepared = pretext.prepareWithSegments(TAGLINE, taglineFont);
    const subtitlePrepared = pretext.prepareWithSegments(SUBTITLE, subtitleFont);

    // Collect all lines
    const allLines: Line[] = [];

    // -- Layout name with obstacle (memoji) on desktop --
    const startX = L.padX;
    let cursorY = L.isMobile ? vh * 0.3 : vh * 0.28;

    // Memoji obstacle rect
    const memojiDrawSize = L.memojiSize;
    const memojiDrawX = L.isMobile ? 0 : startX + L.contentW - memojiDrawSize;
    const memojiDrawY = cursorY - L.lineHeightName * 0.1;

    // Name lines — flow around memoji
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    while (true) {
      // Check if this line overlaps the memoji obstacle
      let availableWidth = L.contentW;
      if (
        !L.isMobile &&
        memojiDrawSize > 0 &&
        cursorY + L.lineHeightName > memojiDrawY &&
        cursorY < memojiDrawY + memojiDrawSize + MEMOJI_PADDING
      ) {
        // Reduce width to leave room for memoji
        availableWidth = L.contentW - memojiDrawSize - MEMOJI_PADDING;
      }

      const line = pretext.layoutNextLine(namePrepared, cursor, availableWidth);
      if (!line) break;

      allLines.push({
        text: line.text,
        x: startX,
        y: cursorY,
        width: line.width,
        font: nameFont,
        color: "#F2F2F2",
      });

      cursor = line.end;
      cursorY += L.lineHeightName;
    }

    // Gap before tagline
    cursorY += L.isMobile ? 16 : 24;

    // Tagline lines
    cursor = { segmentIndex: 0, graphemeIndex: 0 };
    while (true) {
      const line = pretext.layoutNextLine(taglinePrepared, cursor, L.contentW);
      if (!line) break;

      allLines.push({
        text: line.text,
        x: startX,
        y: cursorY,
        width: line.width,
        font: taglineFont,
        color: "#E8845C", // warm accent
      });

      cursor = line.end;
      cursorY += L.lineHeightTagline;
    }

    // Gap before subtitle
    cursorY += L.isMobile ? 8 : 12;

    // Subtitle lines
    cursor = { segmentIndex: 0, graphemeIndex: 0 };
    while (true) {
      const line = pretext.layoutNextLine(subtitlePrepared, cursor, L.contentW);
      if (!line) break;

      allLines.push({
        text: line.text,
        x: startX,
        y: cursorY,
        width: line.width,
        font: subtitleFont,
        color: "#A1A1AA", // text-secondary
      });

      cursor = line.end;
      cursorY += L.lineHeightSubtitle;
    }

    // -- Animate fade-in --
    fadeRef.current = Math.min(1, fadeRef.current + 0.03);
    const alpha = fadeRef.current;

    ctx.globalAlpha = alpha;

    // Draw memoji (desktop only)
    if (!L.isMobile && memoji && memojiDrawSize > 0) {
      ctx.save();
      // Circular clip
      const cx = memojiDrawX + memojiDrawSize / 2;
      const cy = memojiDrawY + memojiDrawSize / 2;
      const r = memojiDrawSize / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(memoji, memojiDrawX, memojiDrawY, memojiDrawSize, memojiDrawSize);
      ctx.restore();

      // Subtle ring
      ctx.beginPath();
      ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(232, 132, 92, 0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw text lines
    ctx.textBaseline = "top";
    for (const line of allLines) {
      ctx.font = line.font;
      ctx.fillStyle = line.color;
      ctx.fillText(line.text, line.x, line.y);
    }

    ctx.globalAlpha = 1;

    // Continue animating if fading in
    if (fadeRef.current < 1) {
      rafRef.current = requestAnimationFrame(render);
    }
  }, []);

  // Setup + resize
  useEffect(() => {
    if (!loaded) return;

    // Reset fade for fresh render
    fadeRef.current = 0;
    render();

    // Animate fade-in
    function animateFade() {
      if (fadeRef.current < 1) {
        render();
        rafRef.current = requestAnimationFrame(animateFade);
      }
    }
    rafRef.current = requestAnimationFrame(animateFade);

    const onResize = () => {
      fadeRef.current = 1; // skip fade on resize
      render();
    };

    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [loaded, render]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ width: "100%", height: "100%" }}
        aria-hidden="true"
      />

      {/* Mobile-only memoji (centered, above canvas text) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/memoji.png"
        alt=""
        aria-hidden="true"
        className="block sm:hidden absolute z-10 w-28 h-28 rounded-full top-[12vh] left-1/2 -translate-x-1/2 ring-2 ring-[var(--accent-warm)]/30"
      />

      {/* Accessible hidden text for screen readers */}
      <div className="sr-only">
        <h1>{NAME}</h1>
        <p>{TAGLINE}</p>
        <p>{SUBTITLE}</p>
      </div>
    </>
  );
}
