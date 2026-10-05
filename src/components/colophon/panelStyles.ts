const CLOSE_MS = 320;
export { CLOSE_MS };

/** Styles for the panel, shipped inside the lazy chunk (same pattern as the Lightbox and the reel). */
export const CSS = `
.cx { position: fixed; inset: 0; width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0;
  border: 0; background: transparent; color: var(--color-ink); overflow: hidden; text-shadow: none; }
.cx::backdrop { background: rgb(6 5 9 / 0.55); opacity: 0; transition: opacity ${CLOSE_MS}ms var(--ease-out-expo); }
.cx[data-state="open"]::backdrop { opacity: 1; }
/* The site hides the native cursor for its own ring, which sits behind a modal dialog: give it back here. */
.cx, .cx * { cursor: auto !important; }
.cx button { cursor: pointer !important; }
.cx-sheet { position: absolute; top: 0; right: 0; bottom: 0; width: min(460px, 100vw); display: flex; flex-direction: column;
  background: var(--color-void-2); border-left: 1px solid var(--color-hairline-strong);
  transform: translateX(40px); opacity: 0; transition: transform 640ms var(--ease-out-expo), opacity 420ms var(--ease-out-expo); }
.cx[data-state="open"] .cx-sheet { transform: none; opacity: 1; }
.cx[data-state="closing"] .cx-sheet { transition-duration: ${CLOSE_MS}ms; }
@media (max-width: 639px) {
  .cx-sheet { top: auto; left: 0; width: 100%; max-height: min(88dvh, 760px); border-left: 0; border-top: 1px solid var(--color-hairline-strong);
    transform: translateY(100%); opacity: 1; }
}
.cx-head { flex: none; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: max(20px, env(safe-area-inset-top)) var(--gutter) 16px; border-bottom: 1px solid var(--color-hairline); }
.cx-title { margin: 6px 0 0; font-size: clamp(1.5rem, 2.2vw, 1.75rem); font-weight: 500; letter-spacing: -0.035em; line-height: 1.05; }
.cx-close { flex: none; margin-top: -6px; color: var(--color-ink); background: none; border: 1px solid var(--color-hairline-strong); border-radius: 2px;
  padding: 10px 14px; min-height: 44px; transition: border-color .25s, color .25s; }
.cx-close:hover { border-color: var(--color-accent); color: var(--color-accent-hot); }
@media (hover: none) { .cx-esc { display: none; } }
.cx-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 var(--gutter) max(28px, env(safe-area-inset-bottom)); }
.cx-lede { margin: 16px 0 0; font-size: 0.9375rem; line-height: 1.55; color: var(--color-muted); text-wrap: pretty; }
.cx-sec { padding: 22px 0 24px; border-top: 1px solid var(--color-hairline); }
.cx-lede + .cx-sec { margin-top: 20px; }
.cx-sec h3 { margin: 0 0 14px; font-weight: 400; }
.cx-note { margin: 12px 0 0; font-size: 0.8125rem; line-height: 1.5; color: var(--color-dim); text-wrap: pretty; }
.cx-vitals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0; }
.cx-vitals > div { min-width: 0; }
.cx-vitals dt { margin: 0; }
.cx-vitals dd { margin: 6px 0 0; }
.cx-big { display: block; font-size: clamp(1.5rem, 7vw, 1.875rem); font-weight: 500; line-height: 1.05; white-space: nowrap; color: var(--color-ink); }
.cx-big small { margin-left: 3px; font-size: 0.5em; font-weight: 400; letter-spacing: 0; color: var(--color-muted); }
.cx-rate { display: block; margin-top: 4px; color: var(--color-dim); }
.cx-rate[data-rating="good"] { color: var(--color-accent-hot); }
.cx-rate[data-rating="needs work"], .cx-rate[data-rating="poor"] { color: var(--color-saffron); }
.cx-rows { margin: 0; }
.cx-rows > div { display: grid; grid-template-columns: 7.5rem minmax(0, 1fr); gap: 16px; padding: 9px 0; border-top: 1px solid var(--color-hairline); align-items: baseline; }
.cx-rows > div:first-child { border-top: 0; padding-top: 0; }
.cx-rows dt, .cx-rows dd { margin: 0; }
.cx-rows dd { font-size: 0.9375rem; line-height: 1.45; color: var(--color-ink); overflow-wrap: anywhere; }
.cx-rows dd span { color: var(--color-muted); }
.cx-chart { position: relative; margin-top: 14px; height: 64px; border-bottom: 1px solid var(--color-hairline-strong); }
.cx-chart canvas { display: block; width: 100%; height: 100%; }
.cx-ref { position: absolute; left: 0; right: 0; height: 0; border-top: 1px dashed var(--color-hairline-strong); pointer-events: none; }
.cx-ref span { position: absolute; left: 0; bottom: 2px; font-size: 11px; color: var(--color-dim); background: var(--color-void-2); padding-right: 6px; }
.cx-read { margin: 10px 0 0; }
.cx-stack { margin: 0; }
.cx-stack > div { display: grid; grid-template-columns: 8.5rem minmax(0, 1fr); gap: 4px 16px; padding: 10px 0; border-top: 1px solid var(--color-hairline); align-items: start; }
.cx-stack > div:first-child { border-top: 0; padding-top: 0; }
.cx-stack dt { margin: 0; font-size: 0.9375rem; color: var(--color-ink); }
.cx-stack dt span { display: block; margin-top: 2px; color: var(--color-dim); }
.cx-stack dd { margin: 0; padding-top: 2px; font-size: 0.875rem; line-height: 1.45; color: var(--color-muted); }
@media (max-width: 420px) { .cx-rows > div, .cx-stack > div { grid-template-columns: minmax(0, 1fr); gap: 2px; } }
.cx-switches { display: grid; margin-top: 18px; border-top: 1px solid var(--color-hairline); }
.cx-sw { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: center; width: 100%; min-height: 44px; padding: 14px 0; text-align: left;
  color: var(--color-ink); background: none; border: 0; border-bottom: 1px solid var(--color-hairline); }
.cx-sw:last-child { border-bottom: 0; padding-bottom: 0; }
.cx-sw[aria-disabled="true"] { opacity: 0.7; }
.cx-sw-title { display: block; font-size: 0.9375rem; font-weight: 500; }
.cx-sw-desc { display: block; margin-top: 4px; font-size: 0.8125rem; line-height: 1.5; color: var(--color-muted); text-wrap: pretty; }
.cx-sw-state { display: inline-flex; align-items: center; gap: 10px; }
.cx-track { position: relative; width: 38px; height: 20px; border: 1px solid var(--color-hairline-strong); border-radius: 2px; transition: border-color .25s; }
.cx-track::after { content: ""; position: absolute; top: 3px; left: 3px; width: 12px; height: 12px; background: var(--color-dim); border-radius: 1px;
  transition: transform .35s var(--ease-out-expo), background-color .25s; }
.cx-sw[aria-checked="true"] .cx-track { border-color: var(--color-accent); }
.cx-sw[aria-checked="true"] .cx-track::after { transform: translateX(18px); background: var(--color-accent-hot); }
.cx-sw:hover .cx-track { border-color: var(--color-accent); }
.cx button:focus-visible { outline: 2px solid var(--color-accent-hot); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .cx *, .cx::backdrop { transition: none !important; } }
`;
