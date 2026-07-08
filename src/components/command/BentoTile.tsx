"use client";

import { memo } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BentoTileData, TileAccent } from "./bento-scenes";

// ---------------------------------------------------------------------------
// Accent → CSS color var
// ---------------------------------------------------------------------------

const ACCENT_VAR: Record<TileAccent, string | undefined> = {
  terracotta: "var(--accent)",
  purple: "var(--accent-purple)",
  teal: "var(--accent-teal)",
  blue: "var(--accent-blue)",
  none: undefined,
};

function accentColor(accent: TileAccent = "none"): string | undefined {
  return ACCENT_VAR[accent];
}

// ---------------------------------------------------------------------------
// Entrance animation (stagger handled by parent via custom index)
// ---------------------------------------------------------------------------

export const tileVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.04 * i,
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  },
};

// ---------------------------------------------------------------------------
// Small leading accent dot — the only solid accent we allow.
// ---------------------------------------------------------------------------

function AccentDot({ accent }: { accent?: TileAccent }) {
  const color = accentColor(accent);
  if (!color) return null;
  return (
    <span
      aria-hidden
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

// ---------------------------------------------------------------------------
// Inner content per tile type
// ---------------------------------------------------------------------------

function TileBody({ tile }: { tile: BentoTileData }) {
  switch (tile.type) {
    case "metric": {
      const color = accentColor(tile.accent);
      return (
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <AccentDot accent={tile.accent} />
            <span className="label-mono">{tile.label}</span>
          </div>
          <div>
            <div
              className="num-display text-[clamp(1.8rem,3.4vw,2.6rem)]"
              style={color ? { color } : { color: "var(--text-primary)" }}
            >
              {tile.value}
            </div>
            {tile.note && (
              <p className="mt-1.5 text-[0.7rem] leading-snug text-[var(--text-tertiary)]">
                {tile.note}
              </p>
            )}
          </div>
        </div>
      );
    }

    case "project": {
      const color = accentColor(tile.accent);
      return (
        <div className="flex h-full flex-col justify-between gap-3">
          <span className="label-mono">project</span>
          <div>
            <div className="flex items-center gap-2">
              {color && (
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: color }}
                />
              )}
              <h3
                className="text-[1.05rem] font-semibold leading-tight tracking-tight text-[var(--text-primary)]"
                style={{ letterSpacing: "-0.01em" }}
              >
                {tile.name}
              </h3>
            </div>
            <p className="mt-1.5 text-[0.78rem] leading-snug text-[var(--text-secondary)]">
              {tile.desc}
            </p>
          </div>
        </div>
      );
    }

    case "arch": {
      return (
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <AccentDot accent={tile.accent} />
            <span className="label-mono">{tile.label}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[0.72rem] leading-relaxed">
            {tile.nodes.map((node, i) => (
              <span key={`${node}-${i}`} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "whitespace-nowrap",
                    i === tile.nodes.length - 1
                      ? "text-[var(--accent-light)]"
                      : "text-[var(--text-secondary)]"
                  )}
                >
                  {node}
                </span>
                {i < tile.nodes.length - 1 && (
                  <span className="text-[var(--text-faint)]" aria-hidden>
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      );
    }

    case "code": {
      return (
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <AccentDot accent={tile.accent} />
            <span className="label-mono">{tile.label}</span>
          </div>
          <pre className="overflow-hidden font-mono text-[0.72rem] leading-relaxed">
            <code>
              {tile.lines.map((line, i) => (
                <span key={i} className="block whitespace-pre-wrap break-words">
                  <CodeLine line={line} />
                </span>
              ))}
            </code>
          </pre>
        </div>
      );
    }

    case "text": {
      return (
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <AccentDot accent={tile.accent} />
            <span className="label-mono">{tile.label}</span>
          </div>
          <p className="text-[0.82rem] leading-snug text-[var(--text-secondary)]">
            {tile.body}
          </p>
        </div>
      );
    }

    case "award": {
      const color = accentColor(tile.accent) ?? "var(--accent)";
      return (
        <div className="flex h-full flex-col justify-between gap-3">
          <span className="label-mono">award</span>
          <div>
            <div className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: color }}
              />
              <h3 className="text-[0.95rem] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">
                {tile.title}
              </h3>
            </div>
            <p className="mt-1.5 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              {tile.issuer}
              {tile.year ? ` · ${tile.year}` : ""}
            </p>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Lightweight syntax tinting for code tiles (no dependency, just regex spans).
// ---------------------------------------------------------------------------

function CodeLine({ line }: { line: string }) {
  // Comments — whole-line tertiary.
  if (line.trim().startsWith("//") || line.trim().startsWith("#")) {
    return <span className="text-[var(--text-faint)]">{line}</span>;
  }

  // Split into string-literal vs. rest, tint strings terracotta-ish.
  const parts = line.split(/("[^"]*")/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^"[^"]*"$/.test(part)) {
          return (
            <span key={i} className="text-[var(--accent-light)]">
              {part}
            </span>
          );
        }
        // Tint keywords / numbers within the non-string segment.
        const tokens = part.split(/(\bconst\b|\blet\b|\brole\b|\b\d+\b|=|\[|\])/g);
        return tokens.map((tok, j) => {
          const key = `${i}-${j}`;
          if (/^(const|let)$/.test(tok)) {
            return (
              <span key={key} className="text-[var(--accent-purple)]">
                {tok}
              </span>
            );
          }
          if (/^\d+$/.test(tok)) {
            return (
              <span key={key} className="text-[var(--accent-teal)]">
                {tok}
              </span>
            );
          }
          return (
            <span key={key} className="text-[var(--text-secondary)]">
              {tok}
            </span>
          );
        });
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tile wrapper
// ---------------------------------------------------------------------------

interface BentoTileProps {
  tile: BentoTileData;
  /** Stagger index. */
  index: number;
  /** Disable entrance animation (reduced motion). */
  staticMode?: boolean;
  /** Optional grid-area for desktop bento placement. */
  area?: string;
  /** Optional click handler (e.g. project tiles drill into their scene). */
  onActivate?: (tile: BentoTileData) => void;
  className?: string;
}

function BentoTileImpl({
  tile,
  index,
  staticMode = false,
  area,
  onActivate,
  className,
}: BentoTileProps) {
  const interactive = tile.type === "project" && typeof onActivate === "function";

  const content = (
    <div className="flex h-full w-full flex-col p-4">
      <TileBody tile={tile} />
    </div>
  );

  const sharedClass = cn(
    // h-full: fill the stretched grid cell — otherwise tiles hug the top of
    // their row and leave dead space whenever a neighbor makes the row taller.
    "tile relative h-full min-h-[112px] w-full overflow-hidden text-left",
    interactive && "cursor-pointer",
    className
  );

  if (staticMode) {
    return (
      <div className="h-full" style={area ? { gridArea: area } : undefined}>
        {interactive ? (
          <button
            type="button"
            className={sharedClass}
            onClick={() => onActivate?.(tile)}
            aria-label={`Explore ${tile.type === "project" ? tile.name : "tile"}`}
          >
            {content}
          </button>
        ) : (
          <div className={sharedClass}>{content}</div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      className="h-full"
      style={area ? { gridArea: area } : undefined}
      custom={index}
      variants={tileVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      {interactive ? (
        <button
          type="button"
          className={sharedClass}
          onClick={() => onActivate?.(tile)}
          aria-label={`Explore ${tile.type === "project" ? tile.name : "tile"}`}
        >
          {content}
        </button>
      ) : (
        <div className={sharedClass}>{content}</div>
      )}
    </motion.div>
  );
}

export const BentoTile = memo(BentoTileImpl);
