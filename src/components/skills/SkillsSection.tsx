"use client";

import { skills, skillCategories, type Skill } from "@/data/skills";
import { cn } from "@/lib/utils";
import { RevealText } from "@/components/ui/RevealText";

function SkillBadge({ skill }: { skill: Skill }) {
  const hasConnections = skill.connections && skill.connections.length >= 3;
  return (
    <span
      className={cn(
        "glass-sm rounded-full px-4 py-2 text-[var(--text-primary)] whitespace-nowrap",
        hasConnections ? "text-sm font-medium" : "text-[13px]"
      )}
    >
      {skill.name}
    </span>
  );
}

export function SkillsSection() {
  const grouped = skillCategories.map((category) => ({
    ...category,
    skills: skills.filter((s) => s.category === category.id),
  }));

  return (
    <section id="skills" className="section py-24 md:py-32">
      {/* Categorized grid — no section header, categories speak for themselves */}
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

              {/* Skill badges — no proficiency bars */}
              <div className="flex flex-wrap gap-2.5">
                {category.skills.map((skill) => (
                  <SkillBadge key={skill.name} skill={skill} />
                ))}
              </div>
            </div>
          </RevealText>
        ))}
      </div>
    </section>
  );
}
