// Shared source strings so every metric cites the same thing the same way.
// A source that is a private repo or a local file uses a neutral "doc:" prefix: these strings ship in the page bundle,
// so they must never carry a local file path. provenance.ts and ledger.ts classify them by suffix (.tex, .csv), by the
// /ME/public/ marker, and read every other "doc:" source as a private repo. A file that exists on a public default
// branch is a link in REPO below instead.
const ROOT = "doc:";

export const SRC = {
  resume: `${ROOT}resume.tex`,
  interviewNotes: `${ROOT}notes.csv`,
  burnesBio: "https://burnes.northeastern.edu/people/dhruv-kamalesh-kumar-2/",
  aiForImpact: "https://burnes.northeastern.edu/ai-for-impact-coop/",
  amazonVct:
    "https://press.aboutamazon.com/2024/12/aws-and-riot-games-announce-the-winner-of-the-valorant-champions-tour-hackathon-esports-manager-challenge",
  northeasternVct: "https://news.northeastern.edu/2025/02/04/valorant-hackathon-challenge-ai/",
  devpost: "https://devpost.com/software/vct-scout",
  naspo: "https://www.naspo.org/awards/george-cronin-awards/winners/2025/",
  naspoAcademic: "https://www.naspo.org/awards/academic-collaboration-recognition/winners/",
  govtech: "https://www.govtech.com/education/higher-ed/northeastern-university-student-projects-improve-government-with-ai",
  massGov:
    "https://www.mass.gov/news/governor-healey-meets-with-northeastern-students-working-with-administration-on-ai-project-under-innovatema-partnership",
  massGovOsd: "https://www.mass.gov/news/osds-process-innovations-earn-national-recognition",
  aiepSfPilot: "https://rebootdemocracy.ai/blog/project-spotlight-co-designing-with-communities",
  publicVoiceLive: "https://publicvoice.innovate-us.org",
  /* Private repos: described on the site, not linked. */
  publicVoiceReadme: `${ROOT}public-voice/README.md`,
  coachReadme: `${ROOT}coaching-tool/README.md`,
  courseReadme: `${ROOT}course-delivery/README.md`,
  oneLGit: `git log, private repo The-Burnes-Center/one-L main`,
  genieGit: `git log, private repo The-Burnes-Center/gen-ai-sandbox-for-impact main`,
  arcNpm: "https://api.npmjs.org/downloads/point/last-month/arc-control-mcp",
  /** Play Console statistics (monthly and daily active users, installed audience), read 5 Oct 2026 for my tenure, 1 Sep 2021 to 31 Aug 2023. Private, so self-reported. */
  acharyaPlay: `${ROOT}play-console.stats`,
  /**
   * Counts aggregated from my local Claude Code, Codex and Cursor history (scripts/agent-usage.mjs). Private, so
   * self-reported. The all-tools token range counts Claude Code and Codex, and extends Cursor from the chats where it
   * kept token counts: its own per-prompt rate at the low end, Claude Code's per-turn rate at the high end.
   */
  agentLogs: `${ROOT}agent-logs.json`,
  acharyaUsers: `${ROOT}/ME/public/photos/acharya-users.jpg`,
  citation: `${ROOT}/ME/public/photos/governors-citation.jpg`,
} as const;

// Public repo receipts. Every path below was confirmed on the default branch of its public repo (4 and 5 Oct 2026).
const AIEP = "https://github.com/The-Burnes-Center/a-iep";
const ABE = "https://github.com/The-Burnes-Center/ai4impact-abe-chatbot-osd";
const ARC = "https://github.com/DB-25/arc-control-mcp";
const VCT = "https://github.com/DB-25/vct-gen-ai";

export const REPO = {
  aiepRepo: AIEP,
  /** Smart Model's router: the 17 Bedrock models it chooses among are listed in model_id_data. */
  genieRouter: "https://github.com/sarahklute/EOTSS-GENIE/blob/main/lib/model-interfaces/langchain/functions/request-handler/adapters/bedrock/metamodel.py",
  /** The public commit log filtered to my GitHub account. GitHub matches by commit email, so it counts commits under both author names. */
  aiepMyCommits: `${AIEP}/commits/main/?author=DB-25`,
  aiepLanguages: `${AIEP}/blob/main/lib/user-interface/index.ts`,
  aiepNameFix: `${AIEP}/commit/56c7e50`,
  aiepResearchLog: `${AIEP}/blob/main/docs/RESEARCH_LOG.md`,
  aiepEvalCost: `${AIEP}/blob/main/docs/EVAL_FEASIBILITY_COST.md`,
  aiepEvalResearch: `${AIEP}/blob/main/docs/AI_EVALUATION_RESEARCH.md`,
  aiepRedactionPlan: `${AIEP}/blob/main/docs/STUDENT_NAME_REDACTION_PLAN.md`,
  aiepTestingPlan: `${AIEP}/blob/main/docs/TESTING_PROTOCOL_PLAN.md`,
  aiepRedactor: `${AIEP}/blob/main/lib/chatbot-api/functions/metadata-handler/steps/redact_ocr/comprehend_redactor.py`,
  aiepStateMachine: `${AIEP}/blob/main/lib/chatbot-api/state-machines/iep-processing.asl.json`,
  aiepStateMachineTests: `${AIEP}/blob/main/test/python/test_iep_processing_state_machine.py`,
  aiepOcr: `${AIEP}/blob/main/lib/chatbot-api/functions/metadata-handler/steps/mistral_ocr/mistral_ocr.py`,
  aiepSubstituteOnRead: `${AIEP}/commit/8303344`,
  aiepOtpFix: `${AIEP}/pull/51`,
  abeEval: `${ABE}/tree/main/lib/chatbot-api/functions/step-functions/llm-evaluation`,
  abeFeedbackToTests: `${ABE}/tree/main/lib/chatbot-api/functions/llm-eval/feedback-to-test-library`,
  abeEvalFix: `${ABE}/commit/7c95b1c`,
  abeReadme: `${ABE}/blob/main/README.md`,
  abeMyCommits: `${ABE}/commits/main/?author=DB-25`,
  arcReadme: `${ARC}/blob/main/README.md`,
  arcReview: `${ARC}/blob/main/docs/agent-review-2026-08-31.md`,
  arcChangelog: `${ARC}/blob/main/CHANGELOG.md`,
  arcSecurity: `${ARC}/blob/main/SECURITY.md`,
  arcTests: `${ARC}/tree/main/test`,
  vctFork: VCT,
  vctTools: `${VCT}/blob/main/lib/chatbot-api/functions/websocket-chat/models/claude3Sonnet.mjs`,
  vctPrompt: `${VCT}/blob/main/lib/chatbot-api/functions/functions.ts`,
  vctReadme: `${VCT}/blob/main/README.md`,
} as const;
