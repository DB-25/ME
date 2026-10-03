import { chapterById } from "@/lib/chapters";
import type { ChapterId } from "@/lib/director/protocol";

/** `01 / ORIGIN` style mono label. Pass `text` to override the chapter label. */
export function SectionLabel({ chapter, text, className = "" }: { chapter: ChapterId; text?: string; className?: string }) {
  const c = chapterById(chapter);
  return (
    <p className={`label ${className}`}>
      <span className="text-accent">{c.index}</span>
      <span className="mx-2 text-faint">/</span>
      {text ?? c.label}
    </p>
  );
}
