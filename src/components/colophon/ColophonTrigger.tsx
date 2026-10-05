"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

/** The panel (and its observers, styles and stack list) is its own chunk, fetched on first open. */
const loadPanel = () => import("./ColophonPanel");
const ColophonPanel = dynamic(loadPanel, { ssr: false });

/** Footer link that opens the Colophon. Nothing of the panel loads until you ask; hover and focus warm the chunk. */
export function ColophonTrigger({ className = "" }: { className?: string }) {
  const [asked, setAsked] = useState(false);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        onClick={() => {
          setAsked(true);
          setOpen(true);
        }}
      >
        How this site works
      </button>
      {asked && <ColophonPanel open={open} onClose={close} />}
    </>
  );
}
