// Lighthouse CI config. LH_FORM_FACTOR=mobile|desktop, LH_BASE_URL=http://localhost:4173/ME.
// Thresholds sit a few points under the measured scores (mobile home ~92, case pages ~85 to 90, desktop ~100) so
// normal run-to-run noise never fails a deploy but a real regression does. Three runs, median.
const mobile = process.env.LH_FORM_FACTOR !== "desktop";
const base = (process.env.LH_BASE_URL ?? "http://localhost:4173").replace(/\/$/, "");
const routes = ["/", "/work/", "/work/genie/", "/work/a-iep/"];

const budget = mobile ? { home: 0.8, other: 0.72 } : { home: 0.9, other: 0.85 };
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
          matchingUrlPattern: "/work/",
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
            "total-blocking-time": ["error", { maxNumericValue: mobile ? 400 : 200, aggregationMethod: "median" }],
          },
        },
      ],
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};
