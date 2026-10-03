// One entry per film project. `frame` is the second in .brag/<slug>/brag.mp4 and `crop` the UI window in
// that 1920x1080 frame (x, y, w, h). `p169` / `p43` place the cropped hero on each canvas; the title
// column is fixed by the template so the six cards read as one series.
export const THUMBS = [
  {
    slug: "a-iep",
    kicker: "Government AI · 2025",
    title: [{ t: "A-IEP" }],
    frame: 3.8,
    crop: [271, 101, 1378, 738],
    p169: { x: 570, w: 940, rotY: -10 },
    p43: { x: 80, y: 302, w: 1040, rotY: -8 },
  },
  {
    slug: "genie",
    kicker: "Government AI · 2024",
    title: [{ t: "GENIE" }],
    frame: 7,
    crop: [68, 215, 1784, 843],
    p169: { x: 570, w: 940, rotY: -10 },
    p43: { x: 80, y: 335, w: 1040, rotY: -8 },
  },
  {
    slug: "abe-one-l",
    kicker: "Government AI · 2025–26",
    title: [{ t: "ABE and" }, { t: "One-L", it: true }],
    frame: 11.5,
    crop: [669, 71, 1230, 938],
    p169: { x: 640, w: 860, rotY: -10 },
    p43: { x: 230, y: 290, w: 740, rotY: -8 },
  },
  {
    slug: "vct-scout",
    kicker: "Hackathon · 2024",
    title: [{ t: "VCT" }, { t: "Scout", it: true }],
    frame: 12.5,
    crop: [1047, 55, 566, 970],
    p169: { x: 1000, w: 440, rotY: -12 },
    p43: { x: 700, y: 150, w: 408, rotY: -10, side: true },
  },
  {
    slug: "arc-control-mcp",
    kicker: "Tooling · 2026",
    title: [{ t: "arc-control-" }, { t: "mcp", it: true }],
    frame: 10,
    crop: [692, 103, 1209, 874],
    p169: { x: 850, w: 680, rotY: -10 },
    p43: { x: 200, y: 280, w: 800, rotY: -8 },
  },
  {
    slug: "public-voice",
    kicker: "Government AI · 2026",
    title: [{ t: "Public" }, { t: "Voice", it: true }],
    frame: 5,
    crop: [306, 105, 1308, 748],
    p169: { x: 570, w: 940, rotY: -10 },
    p43: { x: 100, y: 275, w: 1000, rotY: -8 },
  },
];
