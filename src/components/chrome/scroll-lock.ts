type LenisLike = { stop: () => void; start: () => void };

const getLenis = () => (window as unknown as { lenis?: LenisLike }).lenis;

/** Freeze page scroll (Lenis when running, plain overflow otherwise). Returns the unlock fn. */
export function lockScroll(): () => void {
  const lenis = getLenis();
  const root = document.documentElement;
  const prev = root.style.overflow;
  lenis?.stop();
  root.style.overflow = "hidden";
  return () => {
    root.style.overflow = prev;
    getLenis()?.start();
  };
}
