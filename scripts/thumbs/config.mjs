// One entry per film project; the template, extract and render scripts take any slug listed here.
//   slug     matches .brag/<slug>/brag.mp4 and public/films/<slug>-thumb*.jpg
//   kicker   mono label above the title (keep it under ~24 characters)
//   title    lines; `it: true` sets ONE word in Instrument Serif italic
//   frame    second of brag.mp4 to grab (1920x1080)
//   source   optional: a still in scripts/thumbs/sources/ to crop instead of the film (when the film no
//            longer shows the UI cleanly). `frame` is ignored then.
//   crop     [x, y, w, h] of the app CONTENT in that frame. Exclude the app's own window chrome (dots,
//            url bar): the template draws one consistent frame around every crop. Any aspect works.
//   crop43   optional: a different crop for the 4:3 file (heroes/<slug>-43.png) when the 16:9 crop is too tall.
//   phones   optional, for mobile apps: { source, screens: [[x, y, w, h], ...] }. Built by phones.mjs instead of
//            extract.mjs; the template shows the screens unframed (no window bar).
// Layout, type scale, glow and reflection are fixed in template.html so the series reads as one.
export const THUMBS = [
  {
    slug: "a-iep",
    kicker: "Government AI · 2025",
    title: [{ t: "A-IEP" }],
    frame: 3.8,
    crop: [278, 146, 1366, 690],
  },
  {
    slug: "genie",
    kicker: "Government AI · 2024",
    title: [{ t: "GENIE" }],
    frame: 7,
    crop: [92, 424, 1148, 624],
  },
  {
    slug: "abe-one-l",
    kicker: "Government AI · 2025–26",
    title: [{ t: "ABE and" }, { t: "One-L", it: true }],
    frame: 11.5,
    crop: [676, 118, 1216, 880],
  },
  {
    slug: "vct-scout",
    kicker: "Hackathon · 2024",
    title: [{ t: "VCT" }, { t: "Scout", it: true }],
    source: "sources/vct-scout.jpeg", // real screenshot of the deployed app (TEAM FORMATION cards with portraits)
    crop: [300, 120, 1270, 700],
  },
  {
    slug: "arc-control-mcp",
    kicker: "Tooling · 2026",
    title: [{ t: "arc-control-" }, { t: "mcp", it: true }],
    frame: 10,
    crop: [696, 160, 1200, 816],
  },
  {
    slug: "public-voice",
    kicker: "Government AI · 2026",
    title: [{ t: "Public" }, { t: "Voice", it: true }],
    frame: 5,
    crop: [310, 166, 1300, 684],
  },
  {
    slug: "course-delivery",
    kicker: "Civic AI course · 2026",
    title: [{ t: "Course" }, { t: "Delivery", it: true }],
    frame: 13.7,
    crop: [1016, 170, 628, 770],
  },
  {
    slug: "acharya-erp",
    kicker: "Mobile · 2021",
    title: [{ t: "Acharya" }, { t: "ERP", it: true }],
    phones: {
      source: "../../public/stills/acharya-erp/01.jpg",
      screens: [
        [75, 40, 325, 701],
        [558, 40, 325, 701],
        [1040, 40, 325, 701],
      ],
    },
  },
];
