const NOISE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
  );

/** Film grain: a tiled noise sheet stepped around on the compositor. Purely decorative. */
export function Grain() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      <div
        className="chrome-grain absolute -inset-[220px] opacity-[0.055] mix-blend-screen"
        style={{ backgroundImage: `url("${NOISE}")`, backgroundSize: "220px 220px" }}
      />
      <style>{`
        @keyframes chrome-grain {
          0% { transform: translate3d(0, 0, 0); }
          20% { transform: translate3d(-60px, 40px, 0); }
          40% { transform: translate3d(50px, -90px, 0); }
          60% { transform: translate3d(-110px, -30px, 0); }
          80% { transform: translate3d(80px, 100px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .chrome-grain { animation: chrome-grain 0.9s steps(1) infinite; will-change: transform; }
      `}</style>
    </div>
  );
}
