/**
 * Hand-made line art for the offline cut. Every drawing is a single-weight
 * outline in a 512 x 512 viewBox, the same shape language the live model is
 * asked to use, so the particle sampler treats both identically.
 */

/** Paint lives on a <g>: the sampler strips every attribute on the root <svg>. */
const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;

/** Points along the suspension cable between the two towers (quadratic curve). */
function bridgeHangers(): string {
  const left = 140;
  const right = 372;
  const towerTop = 120;
  const sag = 340;
  const deck = 330;
  return [0.2, 0.35, 0.5, 0.65, 0.8]
    .map((t) => {
      const x = left + (right - left) * t;
      const y = (1 - t) ** 2 * towerTop + 2 * t * (1 - t) * sag + t ** 2 * towerTop;
      return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${deck}"/>`;
    })
    .join("");
}

export const ART = {
  paniPuri: wrap(
    `<path d="M92 290 H420 C420 388 350 436 256 436 C162 436 92 388 92 290 Z"/>` +
      `<path d="M196 462 H316"/>` +
      `<circle cx="184" cy="236" r="52"/><circle cx="328" cy="236" r="52"/><circle cx="256" cy="150" r="52"/>` +
      `<path d="M240 126 Q256 112 272 126"/>` +
      `<path d="M432 96 Q460 138 432 164 Q404 138 432 96 Z"/>`,
  ),

  crosshair: wrap(
    `<circle cx="256" cy="256" r="136"/>` +
      `<path d="M256 60 V206 M256 306 V452 M60 256 H206 M306 256 H452"/>` +
      `<circle cx="256" cy="256" r="3"/>`,
  ),

  lightbulb: wrap(
    `<path d="M256 52 C168 52 112 116 112 192 C112 248 144 282 168 314 C184 336 188 352 188 372 H324 C324 352 328 336 344 314 C368 282 400 248 400 192 C400 116 344 52 256 52 Z"/>` +
      `<path d="M196 416 H316 M220 460 H292"/>` +
      `<path d="M212 196 L256 256 L300 196 M256 256 V372"/>`,
  ),

  handshake: wrap(
    `<rect x="24" y="186" width="64" height="148" rx="10"/><rect x="424" y="186" width="64" height="148" rx="10"/>` +
      `<path d="M88 208 L186 190 M88 322 L186 332 M424 208 L326 190 M424 322 L326 332"/>` +
      `<rect x="186" y="164" width="140" height="190" rx="44"/>` +
      `<path d="M206 214 Q250 196 290 234 L326 270"/>` +
      `<path d="M244 292 H326 M258 326 H326"/>`,
  ),

  bridge: wrap(
    `<path d="M20 330 H492"/>` +
      `<path d="M140 120 V400 M372 120 V400"/>` +
      `<path d="M20 300 L140 120 Q256 340 372 120 L492 300"/>` +
      bridgeHangers() +
      `<path d="M20 440 q32 -26 64 0 t64 0 t64 0 t64 0 t64 0 t64 0 t64 0"/>`,
  ),

  documents: wrap(
    `<rect x="110" y="140" width="250" height="320" rx="16"/>` +
      `<path d="M150 210 H320 M150 262 H320 M150 314 H260"/>` +
      `<path d="M160 140 V104 Q160 90 174 90 H398 Q412 90 412 104 V392 Q412 406 398 406 H360"/>` +
      `<path d="M210 90 V54 Q210 40 224 40 H448 Q462 40 462 54 V342 Q462 356 448 356 H412"/>`,
  ),

  bezier: wrap(
    `<path d="M80 400 C80 120 432 400 432 112"/>` +
      `<path d="M80 400 L80 220 M432 112 L432 292" stroke-width="8"/>` +
      `<rect x="62" y="382" width="36" height="36" rx="4"/><rect x="414" y="94" width="36" height="36" rx="4"/>` +
      `<circle cx="80" cy="216" r="14"/><circle cx="432" cy="296" r="14"/>`,
  ),

  stairs: wrap(
    `<path d="M48 440 H168 V340 H288 V240 H408 V140 H468"/>` +
      `<path d="M48 440 V470 H468 V140"/>`,
  ),

  signal: wrap(
    `<circle cx="256" cy="256" r="22"/>` +
      `<circle cx="256" cy="256" r="88"/>` +
      `<circle cx="256" cy="256" r="154"/>` +
      `<circle cx="256" cy="256" r="220"/>`,
  ),
} as const;

export type ArtId = keyof typeof ART;
