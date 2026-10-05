"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/motion";

type WindowWithLenis = { lenis?: Lenis };
const lenisWindow = () => window as unknown as WindowWithLenis;
const getLenis = () => lenisWindow().lenis;

/** Cancel momentum: Lenis jumps to where the page really is and drops its animation (Lenis.reset is private). */
const freeze = (lenis: Lenis) => lenis.scrollTo(window.scrollY, { immediate: true, force: true });

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** A popstate this recent explains a route change: the browser, not a click, put the page where it belongs. */
const TRAVERSAL_WINDOW_MS = 3000;

const stripBase = (pathname: string) => (BASE_PATH && pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) || "/" : pathname);

/** Path of an internal link without the base path, or null for other origins, downloads and new-tab links. */
function internalPath(anchor: HTMLAnchorElement): string | null {
  if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return null;
  const url = new URL(anchor.href, location.href);
  return url.origin === location.origin ? stripBase(url.pathname) : null;
}

/** Names people (and old links) use for a chapter whose id is something else: the About chapter's id is `origin`. */
const HASH_ALIASES: Record<string, string> = { about: "origin" };

/** `/#about` has no element: point the URL at the real chapter and scroll to it. */
function followHashAlias() {
  const target = HASH_ALIASES[decodeURIComponent(location.hash.slice(1))];
  const el = target ? document.getElementById(target) : null;
  if (!el) return;
  history.replaceState(history.state, "", `${location.pathname}${location.search}#${target}`);
  el.scrollIntoView();
}

export function SmoothScroll() {
  const pathname = usePathname();
  const lastPath = useRef(pathname);
  const lastPopAt = useRef(Number.NEGATIVE_INFINITY);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.6,
      anchors: true,
    });
    lenis.on("scroll", ScrollTrigger.update);
    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);
    lenisWindow().lenis = lenis;

    // Lenis keeps animating toward its last wheel target (1.2 s) while the router swaps pages, and would then
    // apply that target to the new page. Freeze it where it is the moment a navigation starts: a click on a link
    // to another route, or a history step (the browser then restores its own offset, which Lenis follows).
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      const path = anchor && internalPath(anchor);
      if (path && path !== stripBase(location.pathname)) freeze(lenis);
    };
    const onPop = () => {
      lastPopAt.current = performance.now();
      freeze(lenis);
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      gsap.ticker.remove(onTick);
      lenis.destroy();
      delete lenisWindow().lenis;
    };
  }, []);

  // A shared `/#about` link (or one typed by hand) lands on the About chapter. Once the page has its final height.
  useEffect(() => {
    if (pathname !== "/") return;
    const run = () => followHashAlias();
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run, { once: true });
    window.addEventListener("hashchange", run);
    return () => {
      window.removeEventListener("load", run);
      window.removeEventListener("hashchange", run);
    };
  }, [pathname]);

  // Route landed: drop any momentum left from the old page, then place the new one. A push opens at the top (or at
  // its hash); a history step keeps the offset the browser restored, which Lenis picks up from the native scroll.
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    const lenis = getLenis();
    if (!lenis) return;
    freeze(lenis);
    if (performance.now() - lastPopAt.current < TRAVERSAL_WINDOW_MS) return;
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    lenis.scrollTo(target ?? 0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}
