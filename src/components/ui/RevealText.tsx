"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface RevealTextProps {
  children: ReactNode;
  direction?: "up" | "left";
  delay?: number;
  className?: string;
}

const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function RevealText({
  children,
  direction = "up",
  delay = 0,
  className,
}: RevealTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const initial =
    direction === "up"
      ? { opacity: 0, y: 60 }
      : { opacity: 0, x: -40 };

  const animate = isInView
    ? { opacity: 1, y: 0, x: 0 }
    : initial;

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={animate}
      transition={{
        duration: 0.6,
        ease: EXPO_OUT,
        delay,
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
