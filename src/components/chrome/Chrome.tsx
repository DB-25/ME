"use client";

import { Cursor } from "./Cursor";
import { Grain } from "./Grain";
import { Nav } from "./Nav";
import { Preloader } from "./Preloader";
import { ScrollProgress } from "./ScrollProgress";

function focusMain(e: React.MouseEvent<HTMLAnchorElement>) {
  const main = document.getElementById("main");
  if (!main) return;
  e.preventDefault();
  main.tabIndex = -1;
  main.focus({ preventScroll: true });
  main.scrollIntoView();
}

/** Global UI layer: skip link, preloader, nav, cursor, grain and the chapter rail. */
export function Chrome() {
  return (
    <>
      <a
        href="#main"
        onClick={focusMain}
        className="label fixed left-4 top-4 z-[130] -translate-y-24 border border-hairline-strong bg-void px-3 py-2 !text-ink focus:translate-y-0"
      >
        Skip to content
      </a>
      <Preloader />
      <Nav />
      <ScrollProgress />
      <Grain />
      <Cursor />
    </>
  );
}
