import { RULES } from "./rules";
import type { Snapshot } from "./simulate";

/** Where she is in the course, and the quiz gate: a question opens only once 90% of the video has really been seen. */
export function CourseState({ snap, signedUp }: { snap: Snapshot; signedUp: boolean }) {
  const { lessonsDone, lesson, seenPct, unlocked, surveyDone } = snap;
  const finished = lessonsDone >= RULES.lessons;
  let line: string;
  if (!signedUp) line = "Not signed up yet.";
  else if (finished) line = "All 8 lessons done. The certificate is ready to download.";
  else if (!surveyDone) line = "Sign-up survey first, then lesson 1.";
  else if (unlocked) line = `Lesson ${lesson} of 8: video seen, question open.`;
  else if (seenPct > 0) line = `Lesson ${lesson} of 8: ${seenPct}% really seen, question locked (needs 90%).`;
  else line = `Lesson ${lesson} of 8: not started.`;

  return (
    <section className="cts-course" aria-labelledby="cts-course-h">
      <h3 id="cts-course-h" className="label cts-h">Course progress</h3>
      <ol className="cts-segs" aria-hidden>
        {Array.from({ length: RULES.lessons }, (_, i) => {
          const n = i + 1;
          const done = n <= lessonsDone;
          const fill = done ? 100 : n === lesson && signedUp ? seenPct : 0;
          return (
            <li key={n} className="cts-seg" data-done={done || undefined} data-open={(n === lesson && unlocked && !done) || undefined}>
              <span className="cts-seg-fill" style={{ transform: `scaleX(${fill / 100})` }} />
              <span className="label cts-seg-n">{n}</span>
            </li>
          );
        })}
      </ol>
      <p className="cts-course-line">{line}</p>
    </section>
  );
}
