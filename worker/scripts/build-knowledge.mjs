// Builds worker/src/knowledge.ts from the site content, and syncs the protocol.
//
//   npm run knowledge
//
// Reads src/content/*.ts (falls back to src/data/*.ts), bundles each module with
// esbuild, imports it, and serializes every export into compact facts text.
// Emits KNOWLEDGE, PROJECT_SLUGS, CONTACT_EMAIL. Re-run whenever content changes.
import { build } from "esbuild";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const srcDir = join(repo, "src");
const contentDir = [join(srcDir, "content"), join(srcDir, "data")].find(
  (dir) => existsSync(dir) && readdirSync(dir).some((f) => /\.tsx?$/.test(f)),
);
if (!contentDir) throw new Error("No src/content or src/data with .ts files found");

// Keep the worker's copy of the protocol identical to the site's.
copyFileSync(join(srcDir, "lib/director/protocol.ts"), join(here, "../src/protocol.ts"));

// Visual or private fields that are noise (or unsafe) in a facts block.
const SKIP_KEYS = new Set([
  "architecture", "screenshot", "video", "videoAutoplay", "accentColor", "sceneId", "photo",
  "photoAlt", "photoCaption", "artifact", "artifactLabel", "phone", "numericValue", "prefix",
  "suffix", "proficiency", "connections", "color", "kind", "flagship",
  // Launch films, stills and link targets are not facts the Director can use. The film transcripts
  // alone were once 14 KB per export and pushed every project after the first two out of the prompt.
  "film", "vertical", "poster", "thumb", "thumb43", "transcript", "media", "cover", "href", "appears", "sort",
  "isPrivate", "accent", "headlines", "numeric", "image", "links", "source",
]);
// Whole exports that are plumbing (URL registries, film text, label tables) or a restatement of other
// exports (the ledger is built from projects, metrics and recognition), not knowledge.
const SKIP_EXPORTS = new Set(["transcripts.FILM_TRANSCRIPTS", "sources.REPO", "sources.SRC", "provenance.BASIS", "ledger.ledger", "ledger.ledgerProjects"]);
// A section this long means something noisy slipped in. Fail loudly: silent truncation is how
// the Director once knew only two of its fourteen projects.
const MAX_EXPORT_CHARS = 40000;

const clean = (s) => String(s).replace(/\s*\u2014\s*/g, ", ").replace(/\s+/g, " ").trim();

function fmt(value) {
  if (value == null || typeof value === "function") return "";
  if (Array.isArray(value)) {
    const parts = value.map(fmt).filter(Boolean);
    const objects = value.some((v) => v && typeof v === "object");
    return parts.join(objects ? " | " : ", ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([k]) => !SKIP_KEYS.has(k))
      .map(([k, v]) => [k, fmt(v)])
      .filter(([, v]) => v !== "")
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
  }
  return clean(value);
}

function findFirst(value, key) {
  if (!value || typeof value !== "object") return undefined;
  if (typeof value[key] === "string") return value[key];
  for (const v of Object.values(value)) {
    const hit = findFirst(v, key);
    if (hit) return hit;
  }
  return undefined;
}

const tmp = mkdtempSync(join(tmpdir(), "director-knowledge-"));
const files = readdirSync(contentDir).filter((f) => /\.tsx?$/.test(f) && !f.startsWith("index"));
const sections = [];
const slugs = [];
const metricLabels = [];
const projectNames = {};
let email;

try {
  for (const file of files) {
    const outfile = join(tmp, file.replace(/\.tsx?$/, ".mjs"));
    await build({
      entryPoints: [join(contentDir, file)],
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      alias: { "@": srcDir },
      logLevel: "error",
    });
    const mod = await import(pathToFileURL(outfile).href);
    for (const [name, value] of Object.entries(mod)) {
      if (name === "default" || typeof value === "function" || value == null) continue;
      if (SKIP_EXPORTS.has(`${file.replace(/\.tsx?$/, "")}.${name}`)) continue;
      email ??= findFirst(value, "email");
      if (file === "metrics.ts" && name === "metrics") {
        for (const m of value) if (typeof m?.label === "string") metricLabels.push(m.label);
      }
      let body;
      if (Array.isArray(value) && value.some((v) => v && typeof v === "object")) {
        body = value.map((item) => `- ${fmt(item)}`).join("\n");
        if (/project/i.test(name) || /project/i.test(file)) {
          for (const item of value) {
            const slug = item?.slug ?? item?.id;
            if (typeof slug === "string") {
              slugs.push(slug);
              if (typeof item.name === "string") projectNames[slug] = item.name;
            }
          }
        }
      } else {
        body = fmt(value);
      }
      if (!body) continue;
      if (body.length > MAX_EXPORT_CHARS) {
        throw new Error(`${file}.${name} is ${body.length} chars (limit ${MAX_EXPORT_CHARS}): add its noisy keys to SKIP_KEYS or the export to SKIP_EXPORTS`);
      }
      sections.push(`## ${file.replace(/\.tsx?$/, "")}.${name}\n${body}`);
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const projectSlugs = [...new Set(slugs)];
if (projectSlugs.length === 0) throw new Error("No project slugs found; expected a projects export with slug or id");
const knowledge = sections.join("\n\n");

mkdirSync(join(here, "../src"), { recursive: true });
writeFileSync(
  join(here, "../src/knowledge.ts"),
  `// GENERATED by scripts/build-knowledge.mjs from ${contentDir.replace(repo + "/", "")}. Do not edit; run \`npm run knowledge\`.
export const KNOWLEDGE = ${JSON.stringify(knowledge)};

export const PROJECT_SLUGS: string[] = ${JSON.stringify(projectSlugs)};

export const CONTACT_EMAIL = ${JSON.stringify(email ?? "")};

/** Display names by slug, as the Work chapter prints them. The Director uses them to notice a project named in its own words. */
export const PROJECT_NAMES: Record<string, string> = ${JSON.stringify(projectNames)};

/** Labels of the headline figures on the Impact chapter, in page order. show_metric takes one of these. */
export const METRIC_LABELS: string[] = ${JSON.stringify(metricLabels)};
`,
);
console.log(
  `knowledge: ${contentDir.replace(repo + "/", "")} -> src/knowledge.ts (${knowledge.length} chars, ~${Math.round(knowledge.length / 4)} tokens, ${projectSlugs.length} projects: ${projectSlugs.join(", ")})`,
);
