"use client";

import { useEffect } from "react";
import { getMotionPrefs, subscribeMotionPrefs } from "@/components/signal/motionPrefs";
import { setMotionAttr } from "./motion-attr";

/** Mirrors the visitor's "Pause motion" switch onto `html[data-motion]`, which globals.css and the loops key off. */
export function MotionState() {
  useEffect(() => {
    setMotionAttr(getMotionPrefs().paused);
    return subscribeMotionPrefs((next) => setMotionAttr(next.paused));
  }, []);
  return null;
}
