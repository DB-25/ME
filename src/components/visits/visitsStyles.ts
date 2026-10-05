const FADE_MS = 420;
export { FADE_MS };

/** Styles for the egg, shipped inside the lazy chunk (same pattern as the Colophon and the reel). */
export const CSS = `
.ve { position: fixed; inset: 0; z-index: 110; color: var(--color-ink); opacity: 0; transition: opacity ${FADE_MS}ms var(--ease-out-expo);
  display: flex; flex-direction: column; justify-content: space-between; padding: max(28px, env(safe-area-inset-top)) var(--gutter) max(28px, env(safe-area-inset-bottom)); }
.ve[data-state="open"] { opacity: 1; }
.ve[data-view="map"] { background: var(--color-void); }
/* Over the live globe the text sits on a soft void so it stays readable wherever the globe turns. */
.ve[data-view="globe"]::before { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 34% 60% at 14% 50%, rgb(6 5 9 / 0.72), transparent 100%), linear-gradient(to top, rgb(6 5 9 / 0.7), transparent 24%); }
.ve, .ve * { cursor: auto !important; }
.ve button { cursor: pointer !important; }
.ve > * { position: relative; }
.ve-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.ve-eyebrow { display: flex; align-items: center; gap: 12px; margin: 0; }
.ve-demo { border: 1px solid var(--color-saffron); color: var(--color-saffron); padding: 2px 8px; border-radius: 2px; }
.ve-close { flex: none; margin-top: -6px; color: var(--color-ink); background: none; border: 1px solid var(--color-hairline-strong); border-radius: 2px;
  padding: 10px 14px; min-height: 44px; transition: border-color .25s, color .25s; }
.ve-close:hover { border-color: var(--color-accent); color: var(--color-accent-hot); }
.ve button:focus-visible { outline: 2px solid var(--color-accent-hot); outline-offset: 2px; }
.ve-total { display: block; margin: 14px 0 0; font-size: clamp(3rem, 9vw, 6.5rem); font-weight: 500; letter-spacing: -0.05em; line-height: 0.95; }
.ve-lede { margin: 12px 0 0; max-width: 24rem; font-size: 0.9375rem; line-height: 1.55; color: var(--color-muted); text-wrap: pretty; }
.ve-countries { margin: 14px 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 4px 16px; max-width: 24rem; }
.ve-countries li { font-size: 0.8125rem; color: var(--color-muted); }
.ve-countries b { font-weight: 500; color: var(--color-ink); margin-right: 6px; }
.ve-you { margin: 14px 0 0; display: flex; align-items: center; gap: 10px; color: var(--color-ink); opacity: 0; transition: opacity 700ms var(--ease-out-expo); }
.ve-you[data-on="true"] { opacity: 1; }
.ve-you i { width: 9px; height: 9px; border-radius: 50%; background: #fff; box-shadow: 0 0 12px 3px rgb(255 169 77 / 0.7); }
.ve-privacy { margin: 0; max-width: 30rem; color: var(--color-dim); }
.ve-map { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 8px 0; margin: 0 calc(var(--gutter) * -0.5); }
.vm { width: 100%; max-height: 100%; height: auto; }
.vm-land { stroke: rgb(139 123 255 / 0.55); fill: none; }
.vm-pulse { transform-box: fill-box; transform-origin: center; animation: vm-pulse 2.4s ease-in-out infinite; }
.vm-ring { transform-box: fill-box; transform-origin: center; animation: vm-ring 2.6s ease-out infinite; }
@keyframes vm-pulse { 0%, 100% { transform: scale(0.8); opacity: 0.55; } 50% { transform: scale(1.25); opacity: 1; } }
@keyframes vm-ring { 0% { transform: scale(0.4); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }
@media (max-width: 767px) {
  .ve-total { font-size: clamp(2.75rem, 16vw, 4rem); }
}
@media (prefers-reduced-motion: reduce) { .ve { transition: none; } .ve-you { transition: none; } }
`;
