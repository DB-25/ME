import { dependencies } from "../../../package.json";

/** Versions are the ones declared in package.json at build time, ranges stripped. */
const version = (name: keyof typeof dependencies) => dependencies[name].replace(/^[\^~]/, "");

export const STACK = [
  { name: "Next.js", version: version("next"), note: "Static export. Every page is a file, no server renders it." },
  { name: "three.js", version: version("three"), note: "The particle field, on WebGL2." },
  { name: "postprocessing", version: version("postprocessing"), note: "Bloom on the full field." },
  { name: "GSAP", version: version("gsap"), note: "Reveals and scroll-driven motion." },
  { name: "Lenis", version: version("lenis"), note: "Smooth scrolling." },
] as const;
