"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { scrollToTarget } from "@/lib/motion";

type Props = {
  id: string;
  className?: string;
  children: ReactNode;
  /** Runs before the scroll (e.g. close the mobile menu). */
  onNavigate?: () => void;
  /** Wait this long before scrolling, so a scroll lock can release first. */
  delayMs?: number;
  "data-line"?: boolean;
};

/**
 * Link to a home-page section. On the home page it scrolls (Lenis-aware); on any
 * other route (case studies) it routes to `/#id`, with basePath handled by next/link.
 */
export function SectionLink({ id, className, children, onNavigate, delayMs = 0, ...rest }: Props) {
  const isHome = usePathname() === "/";
  if (!isHome) {
    return (
      <Link href={`/#${id}`} className={className} onClick={onNavigate} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={`#${id}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onNavigate?.();
        if (delayMs) window.setTimeout(() => scrollToTarget(`#${id}`), delayMs);
        else scrollToTarget(`#${id}`);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
