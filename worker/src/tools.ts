import { CHAPTER_IDS, FORMATIONS } from "./protocol";
import { PROJECT_SLUGS } from "./knowledge";

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

export const TOOLS: FunctionTool[] = [
  {
    type: "function",
    name: "goto_chapter",
    description:
      "Smooth-scroll the visitor's page to a chapter of the site. Chapters: hero (name and intro), origin (Bangalore to Boston), systems (how he builds), work (selected projects), impact (metrics with receipts), proof (awards and press), director (this feature), human (off duty: games, food), contact (email and socials).",
    strict: true,
    parameters: object({ chapter: chapterEnum }),
  },
  {
    type: "function",
    name: "show_project",
    description: "Spotlight one project: scrolls to the work chapter and focuses that project.",
    strict: true,
    parameters: object({ slug: slugEnum }),
  },
  {
    type: "function",
    name: "open_case_study",
    description: "Open the full case study page for one project. Use sparingly, it leaves the main page.",
    strict: true,
    parameters: object({ slug: slugEnum }),
  },
  {
    type: "function",
    name: "draw",
    description:
      'Morph the particle background into a shape you draw. svg must be a complete <svg viewBox="0 0 512 512">...</svg> using ONLY path, circle, rect, ellipse, line, polyline, polygon, g. Bold line art (stroke-width 6 to 10, stroke="#C9BEFF", fill="none"), 1 to 6 elements, centered inside 64..448, readable as a silhouette of dots. No text, no images, no gradients, no scripts, no hrefs. Max 8 KB. label is a 2 to 5 word caption of what you drew.',
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
      "Morph the particle background into a built-in formation: noise, monogram (DB), globe, network, crowd, constellation, crosshair, portrait (DB himself), singularity.",
    strict: true,
    parameters: object({ formation: { type: "string", enum: [...FORMATIONS] } }),
  },
  {
    type: "function",
    name: "set_hue",
    description: "Tint the particle field with a hex color such as #8B7BFF. Pass null to reset to the default.",
    strict: true,
    parameters: object({ hex: { type: ["string", "null"] } }),
  },
  {
    type: "function",
    name: "end_scene",
    description: "Finish the cut and hand control back to the visitor. Always the last call of a turn.",
    strict: true,
    parameters: object({}),
  },
];
