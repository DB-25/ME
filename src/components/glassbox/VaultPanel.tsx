"use client";

import { motion } from "framer-motion";
import { PHASE_ORDER, type GlassPhase, type VaultDoc } from "./types";

/**
 * The Obsidian-style memory vault — retrieved docs appear staggered once the
 * pipeline reaches "retrieve": blue mono filename, excerpt line under a
 * terracotta highlight wash.
 */

interface VaultPanelProps {
  docs: VaultDoc[];
  phase: GlassPhase;
  reduced: boolean;
}

const RETRIEVE_IDX = PHASE_ORDER.indexOf("retrieve");

export function VaultPanel({ docs, phase, reduced }: VaultPanelProps) {
  const revealed = PHASE_ORDER.indexOf(phase) >= RETRIEVE_IDX;

  return (
    <div className="vault-panel">
      <span className="label-mono">memory vault</span>
      <div className="vault-panel__list">
        {revealed ? (
          docs.map((doc, i) => (
            <motion.div
              key={doc.file}
              className="vault-panel__doc"
              initial={reduced ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      delay: i * 0.25,
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1],
                    }
              }
            >
              <span className="vault-panel__file">{doc.file}</span>
              <span className="vault-panel__line">{doc.line}</span>
            </motion.div>
          ))
        ) : (
          <span className="vault-panel__idle">awaiting retrieval…</span>
        )}
      </div>

      <style>{`
        .vault-panel {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }
        .vault-panel__list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .vault-panel__doc {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }
        .vault-panel__file {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          letter-spacing: 0.02em;
          color: var(--accent-blue);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .vault-panel__line {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          line-height: 1.55;
          color: var(--text-secondary);
          background: var(--accent-glow);
          border-left: 2px solid var(--accent);
          border-radius: 0 6px 6px 0;
          padding: 5px 8px;
          word-break: break-word;
        }
        .vault-panel__idle {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--text-faint);
        }
      `}</style>
    </div>
  );
}
