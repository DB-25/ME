import { ImageResponse } from "next/og";
import { profile } from "@/content";

export const dynamic = "force-static";
export const alt = `${profile.name}, ${profile.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const VOID = "#060509";
const INK = "#EEEAF6";
const MUTED = "#8B8798";
const ACCENT = "#8B7BFF";
const HOT = "#C9BEFF";

const DOT_COUNT = 520;
const FIELD_TOP = 40;
const FIELD_HEIGHT = 330;

/** Deterministic PRNG so the card is identical on every build. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Noise on the left resolves into one clean wave on the right. */
function buildDots() {
  const rand = rng(25);
  return Array.from({ length: DOT_COUNT }, (_, i) => {
    const t = i / DOT_COUNT;
    const x = 40 + t * 1120;
    const wave = Math.sin(t * Math.PI * 5) * (60 - t * 20);
    const spread = Math.pow(1 - t, 1.6) * (FIELD_HEIGHT / 2);
    const y = FIELD_TOP + FIELD_HEIGHT / 2 + wave + (rand() - 0.5) * 2 * spread;
    const size = 2 + rand() * 2.4 + t * 1.6;
    const opacity = 0.25 + t * 0.6 + rand() * 0.15;
    return { x, y, size, opacity, hot: t > 0.8 && rand() > 0.5 };
  });
}

export default function OpenGraphImage() {
  const dots = buildDots();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: VOID,
          backgroundImage: `radial-gradient(circle at 78% 30%, rgba(139,123,255,0.28), rgba(6,5,9,0) 55%)`,
          color: INK,
          fontFamily: "Geist, sans-serif",
        }}
      >
        {dots.map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              width: d.size,
              height: d.size,
              borderRadius: 9999,
              background: d.hot ? HOT : ACCENT,
              opacity: Math.min(d.opacity, 1),
              boxShadow: `0 0 ${d.size * 3}px ${ACCENT}`,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            bottom: 56,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: ACCENT, textTransform: "uppercase" }}>
            {profile.title}
          </div>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 500, letterSpacing: -4, lineHeight: 1.02, marginTop: 8 }}>
            {profile.name}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: MUTED, marginTop: 16, maxWidth: 880, lineHeight: 1.35 }}>
            {profile.oneLiner}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
