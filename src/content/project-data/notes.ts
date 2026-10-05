import type { ProductionNote } from "../types";
import { REPO } from "../sources";

/**
 * Production notes, one list per project slug. A row exists only where a public link or a repo fact backs it;
 * a missing row means there is nothing I can show, not that I forgot. Facts were read from the repos on
 * 4 Oct 2026. Private repos are labelled as such and carry no link.
 */
export const PRODUCTION_NOTES: Record<string, ProductionNote[]> = {
  "a-iep": [
    {
      label: "Evaluation",
      status: "Designed, not run",
      text: "The only automated check on output quality is a schema check: nine sections present, in the right shape. The benchmark is a written design, not a result. It scores atomic facts against both the summary and the source, uses a judge from a different model family, and grades each translation with a per-language judge. No accuracy number exists yet, so none is shown.",
      links: [
        { label: "Eval design and cost", href: REPO.aiepEvalCost },
        { label: "Audit and roadmap", href: REPO.aiepEvalResearch },
      ],
    },
    {
      label: "Cost",
      status: "Projected",
      text: "Judge-based scoring is projected at about $0.25 to $0.55 per document, or $25 to $110 a month at 100 to 200 documents. Those are planning estimates from my cost study, not a bill. A comment in the pipeline’s tests records the median of 100 production and staging runs: 29 seconds to summarize and 24 to translate.",
      links: [{ label: "Pipeline tests", href: REPO.aiepStateMachineTests }],
    },
    {
      label: "Who sees what",
      lines: [
        {
          lead: "Mistral OCR",
          text: "The original page, names included. A no-training enterprise contract limits what Mistral may do with it, not what it receives. The uploaded copy is deleted from Mistral as soon as OCR answers, best effort.",
        },
        {
          lead: "Comprehend",
          text: "The OCR text, inside our AWS account. It replaces every identifier it finds except dates (names included since the September 2026 change; production release 9 Oct 2026), and fails closed: an error stops the run instead of passing text on. How many identifiers it misses is not measured yet.",
        },
        {
          lead: "OpenAI",
          text: "The redacted text, to write and translate the summary. Dates (a date of birth included) and diagnoses stay in it by design, and a school name is not specifically handled. The student’s name is a placeholder that the app swaps in when a parent opens the page.",
        },
      ],
      links: [
        { label: "Redaction design doc", href: REPO.aiepRedactionPlan },
        { label: "Redactor source", href: REPO.aiepRedactor },
      ],
    },
    {
      label: "What broke",
      lines: [
        {
          lead: "Sign-up failed silently.",
          text: "New and re-created accounts never received their phone code, and nobody noticed for at least a month. I fixed it in July and added a CI gate and post-deploy smoke tests.",
        },
      ],
      links: [
        { label: "Name redaction change", href: REPO.aiepNameFix },
        { label: "Redaction plan", href: REPO.aiepRedactionPlan },
        { label: "Sign-up fix", href: REPO.aiepOtpFix },
        { label: "Testing plan", href: REPO.aiepTestingPlan },
      ],
    },
    {
      label: "Reversed",
      text: "My first fix put the child’s name back into the stored summary once processing finished. That turned adding a language into a leak, because it re-reads the stored text. I reversed it the same day: storage keeps a placeholder, and every reader substitutes the name on the way out.",
      links: [{ label: "The commit", href: REPO.aiepSubstituteOnRead }],
    },
    {
      label: "Evidence",
      links: [
        { label: "Pipeline definition", href: REPO.aiepStateMachine },
        { label: "Failure-path tests", href: REPO.aiepStateMachineTests },
        { label: "OCR step", href: REPO.aiepOcr },
      ],
    },
  ],

  genie: [
    {
      label: "Mechanism",
      text: "Smart Model is an LLM router, not a rules table or a trained classifier. In the version I wrote, one Claude 3 Sonnet call on Bedrock reads the user’s prompt beside a sheet on each model (token limit, languages, use cases, price per 1,000 tokens, benchmark scores) and answers with one model name from a fixed list. A rule in that prompt sends any language other than English to Claude 3 Sonnet.",
    },
    {
      label: "Fallback",
      text: "In that version, a failed router call, a name that is not on the list, or an unreadable sheet all send the request to Claude 3 Sonnet. The chosen model is logged for every request.",
    },
    {
      label: "Cost",
      status: "Self-reported",
      text: "The 40% lower spend is self-reported; its baseline and period are not published. Every routed request also pays for one router call before the answer.",
    },
    {
      label: "Evaluation",
      status: "Not measured",
      text: "The repo has no tests and no routing evaluation, so nothing shows that routing kept answers as good as always using one model.",
    },
    {
      label: "Evidence",
      status: "Private repo",
      text: "The Burnes Center repo is private, so the router is described here and not linked.",
    },
  ],

  "abe-one-l": [
    {
      label: "Evaluation",
      status: "Instrumented, no results",
      text: "A Step Functions pipeline scores each test question on seven RAGAS metrics, including faithfulness and context recall. Test questions are curated, plus thumbs-up answers that an LLM rewrites into Q&A. The judge is the same primary Claude model that writes the answers, so the scores are not cross-family. No results are published here, and the screenshot below is sample data.",
      links: [
        { label: "Eval pipeline", href: REPO.abeEval },
        { label: "Feedback to tests", href: REPO.abeFeedbackToTests },
      ],
    },
    {
      label: "Eval time",
      text: "One evaluated question takes about 60 to 90 seconds: a full chatbot answer plus six RAGAS judge calls. A run fans out one question per Lambda, three at a time.",
      links: [{ label: "Why one per Lambda", href: REPO.abeEvalFix }],
    },
    {
      label: "Retrieval",
      text: "Claude Opus 4.6 answers from a Bedrock Knowledge Base on OpenSearch Serverless (semantic chunking, Titan Embed v2), and Sonnet 4.6 takes the fast jobs. ABE began on Kendra in 2024 and moved off it in September 2024, before my first commit.",
      links: [{ label: "README", href: REPO.abeReadme }],
    },
    {
      label: "Guardrails",
      text: "Bedrock Guardrails on the chat path, a web application firewall in front, and Cognito sign-in.",
    },
    {
      label: "What broke",
      lines: [
        {
          lead: "Evals hung as “running”.",
          text: "Large runs passed the 15-minute Lambda limit, and the error handler read the wrong Step Functions path and crashed itself, so the run never left “running”. Now one question per chunk, a real FAILED state, and a Failed chip in the History tab.",
        },
        {
          lead: "An Excel result overflowed the context window.",
          text: "Tool output is now capped before it reaches the model, and I trimmed the system prompt from about 4,400 to 2,500 tokens.",
        },
      ],
    },
    {
      label: "Reversed",
      text: "Retrieval carried a 0.6 score cutoff that looked like a quality gate. Hybrid scores run about 1.3 to 1.6, so it removed nothing. I dropped it and cap chunks per document instead.",
    },
  ],

  "public-voice": [
    {
      label: "Mechanism",
      text: "A model judges whether each open answer is specific enough. If not, it asks one follow-up, two at most, and both can be skipped. On submit, extraction pulls the task, the workflow, the outcome and the public benefit in the background.",
    },
    {
      label: "Privacy",
      text: "Voice goes through our server to OpenAI’s transcription model and is never written to disk. Redaction runs in three layers (browser pattern match, server pattern match, then an AI pass) and fails closed. The pre-redaction original is not stored.",
    },
    {
      label: "Evidence",
      status: "Private repo",
      text: "The production repo is private. The 2025 prototype it grew from is public.",
      links: [{ label: "Prototype repo", href: "https://github.com/DB-25/voice-based-survey-agent" }],
    },
  ],

  "arc-control-mcp": [
    {
      label: "Evaluation",
      status: "Tested",
      text: "Sixteen test files cover the advertised tool schemas, argument validation, timeouts, batch limits and an integration run. There is no benchmark of how often an agent completes a task with it.",
      links: [{ label: "Tests", href: REPO.arcTests }],
    },
    {
      label: "What broke",
      text: "A page script that threw was reported as ok: true, so a four-step batch in which nothing happened looked fully successful. An agent that drove the running server found it on 31 August 2026, in the 0.1.x builds I had been running. npm has only ever carried 0.3.0, which validates every argument and marks failures isError. The public git history starts at that release, so the fix is recorded in the changelog and the review rather than the commit log.",
      links: [
        { label: "Agent review", href: REPO.arcReview },
        { label: "Changelog", href: REPO.arcChangelog },
      ],
    },
    {
      label: "Reversed",
      text: "A call with no tab_id used to fall back to the tab you were looking at, and an agent used that to navigate and reload a tab a person was reading. Tools that change a tab now refuse instead; only read-only tools may fall back.",
    },
    {
      label: "Privacy",
      text: "The server runs JavaScript in your signed-in browser. That is not a sandbox, and the threat model says so. The one guard is aimed at an agent’s mistake, not a hostile agent, and page content is treated as untrusted data.",
      links: [{ label: "Threat model", href: REPO.arcSecurity }],
    },
    {
      label: "Cost",
      text: "Every call spawns an osascript process, a few hundred milliseconds each. That is why tab_id is not mandatory on every tool.",
    },
  ],

  "vct-scout": [
    {
      label: "What I wrote",
      text: "In the public repo, my commits are the system prompt that orchestrates the agent and the tools that save and load a team composition. Rudra Sett built the chat backend and the player-data tools, and Aravind Dasarathy wrote the map tools.",
      links: [
        { label: "System prompt", href: REPO.vctPrompt },
        { label: "Tool schemas", href: REPO.vctTools },
      ],
    },
    {
      label: "Guardrails",
      text: "The model never writes SQL. It fills typed arguments (region, tournament, agent) and a Lambda holds the Athena query. The save tool’s schema asks for exactly five players, no repeated player or agent, and one in-game leader. Those data tools are Rudra’s.",
    },
    {
      label: "What broke",
      lines: [
        {
          lead: "Athena’s 30-minute limit.",
          text: "Queries over 4,700 match files timed out. The team split them by tournament and built intermediate tables.",
        },
        {
          lead: "An unclosed tag.",
          text: "The agent’s visible steps are tags it writes into its reply. I added an explicit rule to the system prompt to close one before opening the next.",
        },
      ],
      links: [{ label: "Team write-up", href: REPO.vctReadme }],
    },
    {
      label: "Evaluation",
      status: "Not measured",
      text: "A hackathon build: no test set, and no evaluation of whether a quoted stat matches the data.",
    },
  ],

  "coaching-tool": [
    {
      label: "Mechanism",
      text: "An orchestrator classifies every message into one of five actions (open a coaching question, continue it, retrieve examples, suggest the next question, or general) and sends it to a prompt-backed agent. Answers cite case studies from a Weaviate library through hybrid search.",
    },
    {
      label: "Guardrails",
      text: "A Pro Tip from the anonymized expert interviews appears only after a gatekeeper and a judge pass it, and never blocks the answer. Interviews are redacted with Comprehend, and the interviewer’s name never enters a model, Step Functions or Weaviate payload. Search returns nothing instead of weak matches.",
    },
    {
      label: "Evaluation",
      status: "Not measured",
      text: "No evaluation of the routing or the Pro Tip judge is in the repo.",
    },
    {
      label: "Evidence",
      status: "Private repo",
      text: "The repo is private. I was technical lead; teammates wrote most of the code.",
    },
  ],

  "course-delivery": [
    {
      label: "Mechanism",
      text: "A learner signs up with a mobile number or an email, confirms a six-digit code and watches one lesson a day. The question after a lesson unlocks only when about 90 percent of the video’s seconds were actually seen, kept as a per-second watch map, so dragging the scrubber to the end changes nothing. A one-question quiz, graded on the server, gates the next lesson, and a personalized PDF certificate follows lesson eight. An admin console shows progress by lesson.",
    },
    {
      label: "Reminders",
      text: "A reminder goes out after 24 hours of inactivity, at most one a day, only in the first 8 days, and never more than two unanswered in a row. An hourly scheduler claims each learner’s day before it sends, so a retried run cannot text twice.",
    },
    {
      label: "Guardrails",
      lines: [
        { lead: "Quiet hours.", text: "Texts go out only between 9 am and 8 pm in the learner’s time zone." },
        {
          lead: "Opt-outs.",
          text: "STOP, START and HELP are handled. A learner who replied STOP is told how to turn texts back on instead of seeing an error.",
        },
        {
          lead: "Carrier rules.",
          text: "Every text starts with the program name, and reminders carry the opt-out line and fit one segment. Links point only to the course’s own domain, never a shortener, because carriers filter texts with links. Message text uses plain characters, because one accented or curly character cuts a segment from 160 characters to 70.",
        },
        {
          lead: "Failed sends.",
          text: "They are sorted into spam filtering, carrier block, unreachable, invalid number and spend limit. Logs mask phone numbers and never keep message text.",
        },
      ],
    },
    {
      label: "What broke",
      lines: [
        {
          lead: "A blank video box.",
          text: "When the video host failed to load, the lesson page showed an empty box. It now shows a Try again button and a link to the video, and a lesson already passed keeps its player.",
        },
        {
          lead: "Admin numbers undercounted.",
          text: "The per-lesson funnel counted from the event log, so learners whose progress predated the log, or whose video an admin marked as watched, were missing. It now counts from progress records.",
        },
        {
          lead: "A wrong claim in my own notes.",
          text: "The first deploy notes said a settings change reaches running servers within about 15 minutes. They cache settings for hours, so I corrected the note and added a deploy option that replaces the containers.",
        },
      ],
    },
    {
      label: "Evaluation",
      status: "Tested",
      text: "29 server test files cover the reminder rules, the watch-coverage check, text wording and length, STOP handling, sign-in limits and the admin API. The course is pre-launch, so there are no usage numbers.",
    },
    {
      label: "Evidence",
      status: "Private repo",
      text: "The repo is private, so nothing here is linked. Status: pre-launch.",
    },
  ],

  "knowledge-agent-for-impact": [
    {
      label: "Retrieval",
      text: "One Amazon Kendra index per deployment, kept in sync by a Lambda, with chat over a WebSocket and Cognito in front. ABE began on this same pattern before it moved to Bedrock Knowledge Bases.",
    },
    {
      label: "Evidence",
      status: "Private repo",
      text: "The repo is private. Student engineers wrote most of the code; my part was technical direction across the program and security fixes.",
    },
  ],
};
