// Shared source strings so every metric cites the same thing the same way.
// Internal references use a neutral "doc:" prefix: these strings ship in the page bundle, so they must never carry a
// local file path. provenance.ts and ledger.ts classify them by suffix (.tex, .csv) and by the /ME/public/ marker.
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
  aiepClaude: `${ROOT}/A-IEP/ai-iep/CLAUDE.md`,
  aiepReadme: `${ROOT}/A-IEP/ai-iep/README.md`,
  aiepHandoff: `${ROOT}/A-IEP/ai-iep/docs/HANDOFF.md`,
  aiepResearchLog: `${ROOT}/A-IEP/ai-iep/docs/RESEARCH_LOG.md`,
  abeReadme: `${ROOT}/ABE/README.md`,
  abeClaude: `${ROOT}/ABE/CLAUDE.md`,
  oneLReadme: `${ROOT}/one-L/README.md`,
  genieReadme: `${ROOT}/gen-ai-sandbox-for-impact/README.md`,
  publicVoiceReadme: `${ROOT}/public-voice/README.md`,
  coachReadme: `${ROOT}/coaching-tool/README.md`,
  courseReadme: `${ROOT}/course-delivery/README.md`,
  arcReadme: `${ROOT}/arc-control-mcp/README.md`,
  arcNpm: "https://api.npmjs.org/downloads/point/last-month/arc-control-mcp",
  acharyaUsers: `${ROOT}/ME/public/photos/acharya-users.jpg`,
  citation: `${ROOT}/ME/public/photos/governors-citation.jpg`,
} as const;

// Public repo receipts. Every path below was confirmed on the default branch of its public repo (4 Oct 2026).
const AIEP = "https://github.com/The-Burnes-Center/a-iep";
const ABE = "https://github.com/The-Burnes-Center/ai4impact-abe-chatbot-osd";
const ARC = "https://github.com/DB-25/arc-control-mcp";
const VCT = "https://github.com/DB-25/vct-gen-ai";

export const REPO = {
  aiepRepo: AIEP,
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
  arcReview: `${ARC}/blob/main/docs/agent-review-2026-08-31.md`,
  arcChangelog: `${ARC}/blob/main/CHANGELOG.md`,
  arcSecurity: `${ARC}/blob/main/SECURITY.md`,
  arcTests: `${ARC}/tree/main/test`,
  vctFork: VCT,
  vctTools: `${VCT}/blob/main/lib/chatbot-api/functions/websocket-chat/models/claude3Sonnet.mjs`,
  vctPrompt: `${VCT}/blob/main/lib/chatbot-api/functions/functions.ts`,
  vctReadme: `${VCT}/blob/main/README.md`,
} as const;
