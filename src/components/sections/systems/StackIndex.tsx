import { stack } from "@/content";
import { FadeIn } from "../origin/FadeIn";

/** A typographic index of the tools, set like a table of contents. */
export function StackIndex() {
  return (
    <div>
      <p className="label">Stack</p>
      <dl className="mt-6 border-b border-hairline">
        {stack.map((group) => (
          <FadeIn
            key={group.name}
            className="grid-12 gap-y-2 border-t border-hairline py-5 md:py-6"
          >
            <dt className="label col-span-12 md:col-span-3 md:pt-[0.55em]">{group.name}</dt>
            <dd className="col-span-12 md:col-span-9">
              <ul className="flex flex-wrap gap-x-[1.4em] text-[clamp(1.0625rem,1.55vw,1.4rem)] leading-[1.55] tracking-[-0.015em] text-ink">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </dd>
          </FadeIn>
        ))}
      </dl>
    </div>
  );
}
