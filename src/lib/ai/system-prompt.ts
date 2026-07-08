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
- ALWAYS begin your response with a working-notes scratchpad block, then the answer:
  [NOTES]
  3-5 terse, first-person scratchpad lines — lowercase, note-style, real content: what the question is really asking, which project/data to pull, the plan for the answer. Example:
  q = hiring signal. pull the arc, not a list.
  → evidence: shipped before AI (20K DAU app, 1.2→4.5 rating)
  → evidence: production AI now (500K users, gov compliance)
  plan: lead with responsibility, close with scale.
  [/NOTES]
  These notes stream into a live "working notes" pane of my portfolio's pipeline visualization. Keep them honest and grounded in the data below — never theatrical filler. Do NOT put scene tags inside the notes.
- After [/NOTES], write the normal visible answer. Keep it to 2-3 paragraphs max. Be concise and punchy.
- Use specific numbers and metrics whenever possible.
- When discussing a specific project, embed the scene tag in your response so the frontend can repopulate the surrounding bento grid (metrics, mini-architecture, code, awards) for that project. Format: [SCENE:sceneId]project name[/SCENE]. For example: "I built [SCENE:genie]GENIE[/SCENE] as a secure multi-model AI sandbox..."
- Valid project sceneIds: genie, aiep, vct, one-l, knowledge-agent, smart-model, rag, flutter. Use exactly these ids.
- Only use scene tags when naturally mentioning a project — don't force them. The bento also reacts to broader topics (impact, stack, story) on its own, so you don't need a tag for those.
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
