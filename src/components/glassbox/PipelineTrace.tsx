"use client";

import { cn } from "@/lib/utils";
import { PHASE_ORDER, type GlassPhase } from "./types";

/**
 * The DB-1 pipeline trace: route() → retrieve k=N → generate → compose → eval.
 * Pending steps sit faint, the active step burns terracotta, done steps cool
 * to teal. Mono 11px, hairline aesthetic — no fills, no glow.
 */

type StepStatus = "pending" | "active" | "done";

const STEP_PHASES: GlassPhase[] = [
  "tokenize",
  "retrieve",
  "generate",
  "compose",
  "eval",
];

interface PipelineTraceProps {
  phase: GlassPhase;
  k: number;
  reduced: boolean;
}

export function PipelineTrace({ phase, k, reduced }: PipelineTraceProps) {
  const labels = ["route()", `retrieve k=${k}`, "generate", "compose", "eval"];
  const cur = PHASE_ORDER.indexOf(phase);

  const statusFor = (i: number): StepStatus => {
    const idx = PHASE_ORDER.indexOf(STEP_PHASES[i]);
    if (phase === "done" || cur > idx) return "done";
    if (cur === idx) return "active";
    return "pending";
  };

  return (
    <div
      className={cn("pipeline-trace", reduced && "pipeline-trace--reduced")}
      aria-label="Pipeline trace"
    >
      <span className="label-mono">pipeline</span>
      <ol className="pipeline-trace__steps">
        {labels.map((label, i) => {
          const status = statusFor(i);
          return (
            <li
              key={STEP_PHASES[i]}
              className={cn(
                "pipeline-trace__step",
                `pipeline-trace__step--${status}`
              )}
            >
              <span className="pipeline-trace__dot" aria-hidden />
              <span className="pipeline-trace__label">{label}</span>
            </li>
          );
        })}
      </ol>

      <style>{`
        .pipeline-trace {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 0;
        }
        .pipeline-trace__steps {
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .pipeline-trace__step {
          display: flex;
          align-items: center;
          gap: 9px;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.03em;
        }
        .pipeline-trace__dot {
          width: 6px;
          height: 6px;
          flex-shrink: 0;
          border-radius: 9999px;
          background: #3a3a40;
          transition: background-color 0.3s var(--ease-hover);
        }
        .pipeline-trace__label {
          transition: color 0.3s var(--ease-hover);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pipeline-trace__step--pending .pipeline-trace__label {
          color: var(--text-faint);
        }
        .pipeline-trace__step--active .pipeline-trace__dot {
          background: var(--accent);
          animation: pipeline-trace-pulse 1.2s ease-in-out infinite;
        }
        .pipeline-trace__step--active .pipeline-trace__label {
          color: var(--text-primary);
        }
        .pipeline-trace__step--done .pipeline-trace__dot {
          background: var(--accent-teal);
        }
        .pipeline-trace__step--done .pipeline-trace__label {
          color: var(--text-tertiary);
        }
        .pipeline-trace--reduced .pipeline-trace__dot {
          animation: none !important;
          transition: none;
        }
        @keyframes pipeline-trace-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}
