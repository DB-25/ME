"use client";

import { skills, skillCategories, type Skill } from "@/data/skills";
import { cn } from "@/lib/utils";
import { RevealText } from "@/components/ui/RevealText";

function SkillBadge({
  skill,
  categoryColor,
}: {
  skill: Skill;
  categoryColor: string;
}) {
  return (
    <div className="flex flex-col items-start">
      <span
        className={cn(
          "glass-sm rounded-full px-4 py-2 text-sm",
          "text-[var(--text-primary)] whitespace-nowrap"
        )}
      >
        {skill.name}
      </span>
      {/* Proficiency bar */}
      <div className="w-full mt-1.5 px-2">
        <div className="h-[3px] w-full rounded-full bg-[var(--bg-border)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${skill.proficiency * 100}%`,
              backgroundColor: categoryColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function SkillsSection() {
  // Group skills by category
  const grouped = skillCategories.map((category) => ({
    ...category,
    skills: skills.filter((s) => s.category === category.id),
  }));

  return (
    <section id="skills" className="section py-24 md:py-32">
      {/* Section heading */}
      <RevealText direction="up">
        <div className="text-center mb-16 md:mb-24">
          <p className="text-caption mb-3 text-[var(--accent-light)]">
            WHAT I WORK WITH
          </p>
          <h2 className="text-h1 text-[var(--text-primary)]">Skills</h2>
        </div>
      </RevealText>

      {/* Categorized grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
        {grouped.map((category, catIdx) => (
          <RevealText
            key={category.id}
            direction="up"
            delay={catIdx * 0.1}
          >
            <div>
              {/* Category heading with color dot */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <h3 className="text-h3 text-[var(--text-primary)]">
                  {category.label}
                </h3>
              </div>

              {/* Skill badges */}
              <div className="flex flex-wrap gap-3">
                {category.skills.map((skill) => (
                  <SkillBadge
                    key={skill.name}
                    skill={skill}
                    categoryColor={category.color}
                  />
                ))}
              </div>
            </div>
          </RevealText>
        ))}
      </div>
    </section>
  );
}
