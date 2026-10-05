// Lighthouse CI config. LH_FORM_FACTOR=mobile|desktop, LH_BASE_URL=http://localhost:4173/ME.
// Thresholds sit under the scores measured on hosted runners (mobile home ~0.78 to 0.9, desktop ~1.0; runners are
// 2 to 3x slower than a laptop) so normal run-to-run noise never fails a deploy but a real regression does.
// Three runs, median.
const mobile = process.env.LH_FORM_FACTOR !== "desktop";
const base = (process.env.LH_BASE_URL ?? "http://localhost:4173").replace(/\/$/, "");
const routes = ["/", "/work/", "/work/genie/", "/work/a-iep/", "/receipts/"];

const budget = mobile ? { home: 0.7, other: 0.65 } : { home: 0.9, other: 0.85 };
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

module.exports = {
  ci: {
    collect: {
      url: routes.map((r) => `${base}${r}`),
      numberOfRuns: 3,
      settings: mobile ? { chromeFlags: "--no-sandbox" } : { preset: "desktop", chromeFlags: "--no-sandbox" },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: `^${escape(base)}/$`,
          assertions: {
            "categories:performance": ["error", { minScore: budget.home, aggregationMethod: "median" }],
          },
        },
        {
          matchingUrlPattern: "/(work|receipts)/",
          assertions: {
            "categories:performance": ["error", { minScore: budget.other, aggregationMethod: "median" }],
          },
        },
        {
          matchingUrlPattern: ".*",
          assertions: {
            "categories:accessibility": ["error", { minScore: 0.95, aggregationMethod: "median" }],
            "categories:best-practices": ["error", { minScore: 0.9, aggregationMethod: "median" }],
            "categories:seo": ["error", { minScore: 0.95, aggregationMethod: "median" }],
            "cumulative-layout-shift": ["error", { maxNumericValue: 0.1, aggregationMethod: "pessimistic" }],
            "total-blocking-time": ["error", { maxNumericValue: mobile ? 700 : 200, aggregationMethod: "median" }],
          },
        },
      ],
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
