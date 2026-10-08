import { CHAPTER_IDS, FORMATIONS } from "./protocol";
import { METRIC_LABELS, PROJECT_SLUGS } from "./knowledge";
import { VOICE_LINES } from "./voice";

/** One OpenAI Responses API function tool (strict mode). */
export type FunctionTool = {
  type: "function";
  name: string;
  description: string;
  strict: true;
  parameters: Record<string, unknown>;
};

const object = (properties: Record<string, unknown>): Record<string, unknown> => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const chapterEnum = { type: "string", enum: [...CHAPTER_IDS] };
const slugEnum = { type: "string", enum: [...PROJECT_SLUGS] };

/** Present only when DB has recorded a library. The line texts live in the system prompt (see prompt.ts). */
const SPEAK_TOOL: FunctionTool[] =
  VOICE_LINES.length === 0
    ? []
    : [
        {
          type: "function",
          name: "speak",
          description:
            "Optional. Play one pre-recorded line in DB's own voice, after you have already answered in text. lineId is an id from the VOICE LIBRARY. Never a substitute for your written answer. At most 2 calls per turn, often none.",
          strict: true,
          parameters: object({ lineId: { type: "string", enum: VOICE_LINES.map((l) => l.id) } }),
        },
      ];

export const TOOLS: FunctionTool[] = [
  ...SPEAK_TOOL,
  {
    type: "function",
    name: "show_project",
    description:
      "Scroll to a project in the Work chapter and spotlight it. The site already does this for any project your sentences name, so call it only for a project you did not name in words.",
    strict: true,
    parameters: object({ slug: slugEnum }),
  },
  {
    type: "function",
    name: "show_metric",
    description:
      "Scroll to the Impact chapter and light up one headline figure. The site already does this for any headline number your sentences quote, so call it only for a figure you did not say in words. label must be one of the listed figure labels, exactly.",
    strict: true,
    parameters: object({ label: { type: "string", enum: [...METRIC_LABELS] } }),
  },
  {
    type: "function",
    name: "goto_chapter",
    description:
      "Smooth-scroll the visitor's page to a chapter of the site. Chapters: hero (name and intro), origin (Bangalore to Boston), systems (how he builds), work (selected projects), impact (metrics with receipts), proof (awards and press), director (this feature), human (off duty: games, food), contact (email and socials). Use contact to close when the visitor should reach DB.",
    strict: true,
    parameters: object({ chapter: chapterEnum }),
  },
  {
    type: "function",
    name: "open_case_study",
    description:
      "Open the full case study page for one project, after the turn ends. Use when the visitor asked for depth on that one project. It leaves the main page, so use it at most once and never together with other navigation to the same project.",
    strict: true,
    parameters: object({ slug: slugEnum }),
  },
  {
    type: "function",
    name: "draw",
    description:
      'Decorative and rare: morph the particle background into a small shape you draw. Never instead of an answer, and only after your written answer. svg must be a complete <svg viewBox="0 0 512 512">...</svg> using ONLY path, circle, rect, ellipse, line, polyline, polygon, g. Bold line art (stroke-width 6 to 10, stroke="#C9BEFF", fill="none"), 1 to 4 elements, centered inside 64..448. No text, no images, no gradients, no scripts, no hrefs. Max 4 KB. label is a 2 to 5 word caption of what you drew.',
    strict: true,
    parameters: object({
      svg: { type: "string", description: "Complete SVG markup, viewBox 0 0 512 512." },
      label: { type: "string", description: "Short caption, 2 to 5 words." },
    }),
  },
  {
    type: "function",
    name: "form",
    description:
      "Decorative: morph the particle background into a built-in formation: noise, signal (noise resolving into clean waveforms), globe, network, crowd, constellation, crosshair, singularity.",
    strict: true,
    parameters: object({ formation: { type: "string", enum: [...FORMATIONS] } }),
  },
  {
    type: "function",
    name: "set_hue",
    description: "Decorative: tint the particle field with a hex color such as #8B7BFF. Pass null to reset to the default.",
    strict: true,
    parameters: object({ hex: { type: ["string", "null"] } }),
  },
  {
    type: "function",
    name: "end_scene",
    description: "Finish the turn and hand control back to the visitor. Only after your written answer is complete. Always the last call.",
    strict: true,
    parameters: object({}),
  },
];
