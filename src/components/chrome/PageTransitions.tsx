"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { projects } from "@/content";
import { chapterById } from "@/lib/chapters";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { PAGE_VT_ATTR, SHARED_TITLE } from "./page-transition";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** Internal routes that take part. Anything else (files, other origins) keeps the browser's own behaviour. */
const ROUTE = /^\/(work\/[a-z0-9-]+\/?)?$/i;
/** The new page gets this long to render. Past it the transition is dropped and the page just appears. */
const ROUTE_TIMEOUT_MS = 1400;
/** Time the new page gets after the route lands (hash scroll, mount effects) before the new snapshot is taken. */
const SETTLE_MS = 60;
/** Names that are rows, not links: the old title to morph from. */
const TITLE_SOURCES = ".wk-name, .cs-next-name, .wk-lab-name";

type Wipe = { root: HTMLDivElement; label: HTMLDivElement; kicker: HTMLSpanElement; name: HTMLSpanElement };

/** Timers, not rAF: while a view transition waits for its DOM update, rendering is suppressed and frames never come. */
const settle = (ms: number) => new Promise<void>((res) => window.setTimeout(res, ms));

function stripBase(pathname: string): string | null {
  if (BASE_PATH && !pathname.startsWith(BASE_PATH)) return null;
  return pathname.slice(BASE_PATH.length) || "/";
}

/** Where the link leads, for the fallback wipe: a small mono kicker and a serif italic name. */
function destinationLabel(path: string, hash: string): { kicker: string; name: string } {
  if (path.startsWith("/work/")) {
    const slug = path.split("/")[2];
    return { kicker: "03 / Work", name: projects.find((p) => p.slug === slug)?.name ?? "Case study" };
  }
  const id = hash.replace("#", "");
  const chapter = ["work", "impact", "proof", "origin", "human", "contact"].includes(id) ? chapterById(id as "work") : null;
  return chapter ? { kicker: `${chapter.index} / Home`, name: chapter.label } : { kicker: "Home", name: "Dhruv Kamalesh Kumar" };
}

function visibleTitle(el: Element | null): HTMLElement | null {
  if (!(el instanceof HTMLElement)) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > window.innerHeight) return null;
  return el;
}

/**
 * Authored route transitions between the home page and case studies (and case to case via "Up next").
 *
 * - Browsers with View Transitions: the project title morphs from the row (or the "Up next" block) into the case
 *   heading while the page dissolves; the case page's own reveals play right after.
 * - Browsers without: a void wipe that carries the destination label, driven by GSAP in expo.out.
 * - Back / forward: the same wipe, so a history step is never a hard cut. The browser restores scroll itself.
 * - Reduced motion: nothing here runs, navigation is untouched.
 *
 * Clicks on internal links are claimed in the capture phase (preventDefault only: next/link sees `defaultPrevented`
 * and stands down) and routed through the app router, so no link needs to know about any of this.
 */
export function PageTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const arrived = useRef<(() => void) | null>(null);
  const wipe = useRef<Wipe | null>(null);
  const busy = useRef(false);

  // Route landed: release whoever is waiting for it.
  useEffect(() => {
    pathRef.current = pathname;
    arrived.current?.();
  }, [pathname]);

  useEffect(() => {
    const ensureWipe = (): Wipe => {
      if (wipe.current) return wipe.current;
      const root = document.createElement("div");
      root.setAttribute("aria-hidden", "true");
      root.style.cssText =
        "position:fixed;inset:0;z-index:140;background:#060509;pointer-events:none;display:flex;align-items:flex-end;padding:0 var(--gutter) clamp(28px,6vh,56px);clip-path:inset(100% 0 0 0);visibility:hidden";
      const label = document.createElement("div");
      label.style.cssText = "display:flex;flex-direction:column;gap:10px;opacity:0";
      const kicker = document.createElement("span");
      kicker.className = "label";
      kicker.style.color = "var(--color-accent-hot)";
      const name = document.createElement("span");
      name.style.cssText = "font-family:var(--font-serif);font-style:italic;font-size:clamp(2.25rem,6.5vw,6rem);line-height:1;letter-spacing:-0.02em;color:var(--color-ink)";
      label.append(kicker, name);
      root.appendChild(label);
      document.body.appendChild(root);
      wipe.current = { root, label, kicker, name };
      return wipe.current;
    };

    /** Cover the page from below (expo.out). Resolves when fully covered. */
    const wipeIn = (dest: { kicker: string; name: string }, duration = 0.5) => {
      const w = ensureWipe();
      w.kicker.textContent = dest.kicker;
      w.name.textContent = dest.name;
      gsap.killTweensOf([w.root, w.label]);
      gsap.set(w.root, { clipPath: "inset(100% 0% 0% 0%)", visibility: "visible" });
      gsap.set(w.label, { opacity: 0, y: 12 });
      gsap.to(w.label, { opacity: 1, y: 0, duration: duration * 1.1, ease: "expo.out", delay: 0.05 });
      return new Promise<void>((res) =>
        gsap.to(w.root, { clipPath: "inset(0% 0% 0% 0%)", duration, ease: "expo.out", onComplete: res }),
      );
    };
    /** Lift off the top, label first. */
    const wipeOut = (duration = 0.6) => {
      const w = ensureWipe();
      gsap.to(w.label, { opacity: 0, y: -10, duration: duration * 0.5, ease: "expo.out" });
      gsap.to(w.root, {
        clipPath: "inset(0% 0% 100% 0%)",
        duration,
        ease: "expo.out",
        delay: 0.05,
        onComplete: () => {
          gsap.set(w.root, { visibility: "hidden" });
        },
      });
    };

    /** Resolves once the app router has rendered `pathname`, or false after the timeout. */
    const routeLanded = (target: string) =>
      new Promise<boolean>((res) => {
        const done = (ok: boolean) => {
          arrived.current = null;
          window.clearTimeout(timer);
          res(ok);
        };
        const timer = window.setTimeout(() => done(false), ROUTE_TIMEOUT_MS);
        const check = () => {
          if (stripBase(location.pathname) === target) done(true);
        };
        arrived.current = check;
        check();
      });

    const supportsVT = () => typeof document.startViewTransition === "function";

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (prefersReducedMotion()) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin) return;
      const path = stripBase(url.pathname);
      if (path === null || !ROUTE.test(path)) return;
      if (path === stripBase(location.pathname)) return; // same page: hash scroll, Lenis handles it
      e.preventDefault();
      if (busy.current) return;
      busy.current = true;
      const href = `${path}${url.search}${url.hash}`;
      const html = document.documentElement;

      const finish = () => {
        busy.current = false;
        html.removeAttribute(PAGE_VT_ATTR);
        document.querySelectorAll<HTMLElement>(`[data-vt-name]`).forEach((n) => {
          n.style.viewTransitionName = "";
          n.removeAttribute("data-vt-name");
        });
      };

      if (supportsVT()) {
        // Title to morph from: only when it is on screen and the destination is a case page.
        let shared = false;
        if (path.startsWith("/work/")) {
          const src = visibleTitle(anchor.matches(TITLE_SOURCES) ? anchor : anchor.querySelector(TITLE_SOURCES));
          if (src) {
            src.style.viewTransitionName = SHARED_TITLE;
            src.setAttribute("data-vt-name", "");
            shared = true;
          }
        }
        html.setAttribute(PAGE_VT_ATTR, shared ? "shared" : "plain");
        const vt = document.startViewTransition(async () => {
          router.push(href);
          const ok = await routeLanded(path);
          if (!ok) return;
          const title = path.startsWith("/work/") ? document.querySelector<HTMLElement>(".cs-title") : null;
          if (title && shared) {
            title.style.viewTransitionName = SHARED_TITLE;
            title.setAttribute("data-vt-name", "");
          }
          await settle(SETTLE_MS);
        });
        void vt.finished.then(finish, finish);
        return;
      }

      // Fallback: void wipe carrying the destination.
      void (async () => {
        await wipeIn(destinationLabel(path, url.hash));
        router.push(href);
        await routeLanded(path);
        await settle(SETTLE_MS * 2);
        wipeOut();
        busy.current = false;
      })();
    };

    // History steps cannot be intercepted (the router handles popstate itself), so cover them: the wipe drops in
    // while the router swaps pages and the browser restores scroll underneath, then lifts.
    const onPop = () => {
      if (prefersReducedMotion()) return;
      const target = stripBase(location.pathname);
      if (!target || target === pathRef.current) return;
      void (async () => {
        const w = ensureWipe();
        w.kicker.textContent = "";
        w.name.textContent = "";
        gsap.killTweensOf([w.root, w.label]);
        gsap.set(w.root, { clipPath: "inset(100% 0% 0% 0%)", visibility: "visible" });
        await new Promise<void>((res) => gsap.to(w.root, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.28, ease: "expo.out", onComplete: res }));
        await routeLanded(target);
        await settle(SETTLE_MS * 3);
        wipeOut(0.7);
      })();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      wipe.current?.root.remove();
      wipe.current = null;
    };
  }, [router]);

  return null;
}
