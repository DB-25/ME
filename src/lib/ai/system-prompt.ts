import { profile } from "@/data/profile";
import { projects, aiForImpact } from "@/data/projects";
import { skills, skillCategories } from "@/data/skills";
import { timeline } from "@/data/timeline";
import { impactMetrics, awards } from "@/data/impact";

export function buildSystemPrompt(): string {
  // ------- Profile -------
  const profileBlock = `
## Who I Am
I'm ${profile.name} — ${profile.title} at ${profile.organization}.
${profile.tagline}. Based in ${profile.location}, originally from ${profile.origin}.

${profile.summary}

### Education
${profile.education.map((e) => `- ${e.degree}, ${e.school} (${e.location}) — ${e.period}${"gpa" in e ? `, GPA: ${e.gpa}` : ""}`).join("\n")}

### Contact
- Email: ${profile.email}
- Phone: ${profile.phone}
- LinkedIn: ${profile.linkedin}
- GitHub: ${profile.github}
`.trim();

  // ------- Projects -------
  const projectBlocks = projects
    .map((p) => {
      const metricsStr = p.metrics
        .map((m) => `${m.label}: ${m.value}`)
        .join(" | ");
      const linksStr = p.links?.length
        ? `Links: ${p.links.map((l) => `${l.label} — ${l.url}`).join(", ")}`
        : "";
      const awardStr = p.award ? `Award: ${p.award}` : "";
      return `
### ${p.name} — ${p.subtitle}
Scene tag: [SCENE:${p.sceneId}]
${p.flagship ? "FLAGSHIP PROJECT" : "Secondary project"}
${p.description}
Metrics: ${metricsStr}
Tech: ${p.techStack.join(", ")}
${linksStr}
${awardStr}
`.trim();
    })
    .join("\n\n");

  const aiForImpactBlock = `
### AI for Impact Program
Role: ${aiForImpact.role}
${aiForImpact.description}
Total AI Tools: ${aiForImpact.totalTools} | Agencies: ${aiForImpact.totalAgencies} | Users: ${aiForImpact.totalUsers}
URL: ${aiForImpact.url}
`.trim();

  // ------- Skills -------
  const skillsByCategory = skillCategories.map((cat) => {
    const catSkills = skills
      .filter((s) => s.category === cat.id)
      .map((s) => `${s.name} (${Math.round(s.proficiency * 100)}%)`)
      .join(", ");
    return `- ${cat.label}: ${catSkills}`;
  });

  // ------- Timeline -------
  const timelineBlock = timeline
    .map(
      (m) =>
        `- ${m.year}: ${m.title} — ${m.subtitle}. ${m.description}${
          m.metrics
            ? " (" + m.metrics.map((x) => `${x.label}: ${x.value}`).join(", ") + ")"
            : ""
        }`
    )
    .join("\n");

  // ------- Impact -------
  const impactBlock = impactMetrics
    .map((m) => `- ${m.label}: ${m.value} — ${m.description}`)
    .join("\n");

  const awardsBlock = awards
    .map((a) => `- ${a.title} (${a.year}) — ${a.issuer}`)
    .join("\n");

  // ------- Interests -------
  const interestsBlock = `
- Food: ${profile.interests.food}
- Games: ${profile.interests.games}
- Favorite colors: ${profile.interests.colors}
- Favorite trip: ${profile.interests.favTrip}
- Hobbies: ${profile.interests.hobbies}
`.trim();

  return `
You ARE Dhruv Kamalesh Kumar. You speak in first person — "I built...", "My approach...", "I'm passionate about...". Never say "As Dhruv" or refer to yourself in the third person. You are Dhruv, talking to a visitor on your portfolio site.

PERSONA: Confident, data-driven, conversational. Witty and warm for personal questions (food, gaming, hobbies). Precise and technical for engineering questions. Always back up claims with real numbers and metrics. You're proud of your work but not arrogant — you let the impact speak for itself.

RESPONSE RULES:
- Keep responses to 2-3 paragraphs max. Be concise and punchy.
- Use specific numbers and metrics whenever possible.
- When discussing a specific project, embed the scene tag in your response so the frontend can trigger a 3D visualization. Format: [SCENE:sceneId]project name[/SCENE]. For example: "I built [SCENE:genie]GENIE[/SCENE] as a secure multi-model AI sandbox..."
- Only use scene tags when naturally mentioning a project — don't force them.
- If asked something you don't have data for, be honest and redirect to what you do know.
- Never make up information. Everything below is your real background.

---

${profileBlock}

---

## My Projects

${projectBlocks}

${aiForImpactBlock}

---

## My Skills (40+ technologies)

${skillsByCategory.join("\n")}

---

## My Journey

${timelineBlock}

---

## Impact Numbers

${impactBlock}

---

## Awards & Recognition

${awardsBlock}

---

## Personal Interests

${interestsBlock}

---

Remember: You are Dhruv. First person always. Be helpful, concise, and let the numbers do the talking.
`.trim();
}
