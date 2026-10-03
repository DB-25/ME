import { CHAPTER_IDS, FORMATIONS } from "./protocol";
import type { ChapterId, DirectorAction, FormationId } from "./protocol";
import { PROJECT_SLUGS } from "./knowledge";
import { sanitizeSvg } from "./svg";

const SLUGS = new Set(PROJECT_SLUGS);
const MAX_LABEL = 60;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function expandHex(hex: string): string {
  if (hex.length === 4) return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  return hex.toLowerCase();
}

/**
 * Validate one model tool call. Returns the DirectorAction, or null (and the
 * reason via `onDrop`) when it should be silently dropped.
 */
export function toAction(name: string, rawArgs: string, onDrop: (reason: string) => void): DirectorAction | null {
  let args: unknown;
  try {
    args = rawArgs.trim() === "" ? {} : JSON.parse(rawArgs);
  } catch {
    onDrop(`${name}: arguments are not JSON`);
    return null;
  }
  if (!isRecord(args)) {
    onDrop(`${name}: arguments are not an object`);
    return null;
  }

  switch (name) {
    case "goto_chapter": {
      const chapter = args.chapter;
      if (!(CHAPTER_IDS as readonly unknown[]).includes(chapter)) return drop(onDrop, `unknown chapter ${String(chapter)}`);
      return { name, args: { chapter: chapter as ChapterId } };
    }
    case "show_project":
    case "open_case_study": {
      const slug = args.slug;
      if (typeof slug !== "string" || !SLUGS.has(slug)) return drop(onDrop, `unknown slug ${String(slug)}`);
      return { name, args: { slug } };
    }
    case "form": {
      const formation = args.formation;
      if (!(FORMATIONS as readonly unknown[]).includes(formation)) return drop(onDrop, `unknown formation ${String(formation)}`);
      return { name, args: { formation: formation as FormationId } };
    }
    case "set_hue": {
      const hex = args.hex;
      if (hex === null) return { name, args: { hex: null } };
      if (typeof hex !== "string" || !HEX.test(hex)) return drop(onDrop, `bad hex ${String(hex)}`);
      return { name, args: { hex: expandHex(hex) } };
    }
    case "draw": {
      const result = sanitizeSvg(args.svg);
      if (!result.ok) return drop(onDrop, `svg rejected: ${result.reason}`);
      // eslint-disable-next-line no-control-regex
      const label = typeof args.label === "string" ? args.label.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, MAX_LABEL) : "";
      return { name, args: { svg: result.svg, label } };
    }
    case "end_scene":
      return { name, args: {} };
    default:
      return drop(onDrop, `unknown tool ${name}`);
  }
}

function drop(onDrop: (reason: string) => void, reason: string): null {
  onDrop(reason);
  return null;
}
