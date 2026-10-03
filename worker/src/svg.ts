/**
 * Strict SVG sanitizer for model-drawn shapes. No DOM in Workers, so this is a
 * tokenizer that rebuilds the markup from an allowlist. Anything unexpected
 * rejects the whole drawing (the caller drops the action).
 */

export const MAX_SVG_BYTES = 8 * 1024;
const MAX_ELEMENTS = 400;
const MAX_ATTR_LENGTH = 6000;

const ELEMENTS = new Set(["svg", "g", "path", "circle", "rect", "ellipse", "line", "polyline", "polygon"]);

const ATTRIBUTES = new Set([
  // geometry
  "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "points", "transform",
  // paint
  "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-opacity",
  "fill", "fill-opacity", "fill-rule", "opacity",
]);

const TAG = /<(\/?)([A-Za-z][A-Za-z0-9]*)((?:\s+[A-Za-z_:][\w:.-]*\s*=\s*(?:"[^"<>]*"|'[^'<>]*'))*)\s*(\/?)>/y;
const ATTR = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const UNSAFE_VALUE = /url\(|javascript:|data:|expression\(|&|\\/i;

export type SvgResult = { ok: true; svg: string } | { ok: false; reason: string };

const normalizeViewBox = (value: string) => value.trim().split(/[\s,]+/).join(" ");

export function sanitizeSvg(input: unknown): SvgResult {
  if (typeof input !== "string") return { ok: false, reason: "not a string" };
  if (new TextEncoder().encode(input).length > MAX_SVG_BYTES) return { ok: false, reason: "too large" };

  const stack: string[] = [];
  let out = "";
  let elements = 0;
  let sawRoot = false;
  let closedRoot = false;
  let drawable = 0;
  let i = 0;

  while (i < input.length) {
    if (input[i] !== "<") {
      const next = input.indexOf("<", i);
      const text = input.slice(i, next === -1 ? input.length : next);
      if (text.trim() !== "") return { ok: false, reason: "text content" };
      i = next === -1 ? input.length : next;
      continue;
    }

    TAG.lastIndex = i;
    const match = TAG.exec(input);
    if (!match) return { ok: false, reason: "malformed or forbidden markup" };
    i = TAG.lastIndex;
    const [, closing, name, rawAttrs, selfClose] = match;

    if (!ELEMENTS.has(name)) return { ok: false, reason: `element <${name}> not allowed` };
    if (closedRoot) return { ok: false, reason: "content after </svg>" };

    if (closing) {
      if (stack.pop() !== name) return { ok: false, reason: "unbalanced tags" };
      out += `</${name}>`;
      if (stack.length === 0) closedRoot = true;
      continue;
    }

    elements += 1;
    if (elements > MAX_ELEMENTS) return { ok: false, reason: "too many elements" };

    const isRoot = name === "svg";
    if (isRoot !== !sawRoot) return { ok: false, reason: isRoot ? "nested svg" : "missing svg root" };

    let attrs = "";
    let viewBox: string | undefined;
    for (const attr of rawAttrs.matchAll(ATTR)) {
      const key = attr[1];
      const value = attr[2] ?? attr[3] ?? "";
      if (isRoot) {
        if (key === "viewBox") viewBox = normalizeViewBox(value);
        continue; // root attributes are rebuilt below
      }
      if (!ATTRIBUTES.has(key)) continue; // strip anything that is not geometry, stroke, fill or transform
      if (value.length > MAX_ATTR_LENGTH || UNSAFE_VALUE.test(value) || value.includes('"')) {
        return { ok: false, reason: `unsafe value for ${key}` };
      }
      attrs += ` ${key}="${value}"`;
    }

    if (isRoot) {
      if (viewBox !== "0 0 512 512") return { ok: false, reason: "viewBox must be 0 0 512 512" };
      sawRoot = true;
      out += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">';
      if (selfClose) return { ok: false, reason: "empty svg" };
      stack.push("svg");
      continue;
    }

    if (name !== "g") drawable += 1;
    if (selfClose) {
      out += `<${name}${attrs}/>`;
    } else {
      out += `<${name}${attrs}>`;
      stack.push(name);
    }
  }

  if (!closedRoot || stack.length > 0) return { ok: false, reason: "unclosed svg" };
  if (drawable === 0) return { ok: false, reason: "nothing drawn" };
  return { ok: true, svg: out };
}
