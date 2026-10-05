/** Text alternative for the reel, mirrored from .brag/reel/transcript.txt. Times are reel time. */
export type TranscriptEntry = {
  time: string;
  title: string;
  /** The lower third shown over the project clip. */
  lowerThird?: string;
  onScreen?: string;
  visual: string;
};

export const TRANSCRIPT_INTRO =
  "43 seconds, a quiet music bed, no voiceover. Every product screen comes from the launch film for that project. Each project segment carries the same lower third: index, project name and one real figure.";

export const TRANSCRIPT: TranscriptEntry[] = [
  {
    time: "0:00 to 0:03",
    title: "Cold open",
    onScreen: "Showreel 2026. Dhruv Kamalesh Kumar. AI Engineer.",
    visual:
      "A band of thin violet lines starts as dense noise on the left and resolves into smooth flowing waves, the same noise-to-signal motif as the hero. The name and title rise in over it.",
  },
  {
    time: "0:03 to 0:09",
    title: "01 A-IEP",
    lowerThird: "A-IEP. 375+ IEPs read in plain language.",
    onScreen: "Tap any term. Get a plain definition. Read it in your own language.",
    visual:
      "A special-education plan summary. A tapped term opens a glossary drawer with a plain definition of Special Education, then the language menu switches the summary from English to Spanish, Vietnamese and Chinese.",
  },
  {
    time: "0:09 to 0:15",
    title: "02 GENIE",
    lowerThird: "GENIE. 44,000+ state employees with access.",
    onScreen:
      "Two to four models, side by side. Smart Model picks the model so you don't have to. 40%, lower model spend, self-reported.",
    visual:
      "Three model panels answer the same prompt at once. Then the Smart Model view ticks Task, Cost and Token size and highlights the chosen model.",
  },
  {
    time: "0:15 to 0:21",
    title: "03 ABE + One-L",
    lowerThird: "ABE + One-L. 2 NASPO awards in 2025.",
    onScreen:
      "ABE, Assistive Buyer Engine. Answers a buyer's question, with citations. Quality, measured. One-L. Flags contract conflicts and writes the redline. 83% less legal review time, self-reported, illustrative recording.",
    visual:
      "A cited answer in the ABE chat, the quality monitoring results, then the One-L contract review where a clause is struck and replaced with a redline.",
  },
  {
    time: "0:21 to 0:27",
    title: "04 arc-control-mcp",
    lowerThird: "arc-control-mcp. 26 tools in six modules.",
    visual:
      "A transcript of tool calls beside a browser window. The agent fills a contact form in its own background tab while the user's tab stays selected. Then a counter climbs to 26 beside a scrolling list of tool names.",
  },
  {
    time: "0:27 to 0:33",
    title: "05 VCT Scout",
    lowerThird: "VCT Scout. 2nd of 3,200+, AWS x Riot Games hackathon.",
    onScreen:
      "AWS Bedrock agent, tool calling. The agent picks its tools. Roster, from pro player data. Five players. Real stats. 4,700+ match files queried.",
    visual:
      "The agent's tool-call steps appear in the chat, then roster cards with agent portraits slide into the Team Formation panel one by one, each with kills, deaths and games.",
  },
  {
    time: "0:33 to 0:39",
    title: "06 Public Voice",
    lowerThird: "Public Voice. 2 languages, English and Spanish.",
    onScreen: "Answer out loud. Asked only when an answer is vague. Organizers see what we heard.",
    visual:
      "A survey question with a live voice waveform and a transcript forming. One follow-up question appears under the confirmed answer. Then illustrative answers settle into theme groups on the organizer dashboard.",
  },
  {
    time: "0:39 to 0:43",
    title: "Close",
    onScreen: "Dhruv Kamalesh Kumar, AI Engineer. I ship AI products end to end. dhruvbaradiya@gmail.com. Boston, MA.",
    visual:
      "The same flowing waves, now clean, run behind the closing line. The email address is set in monospace. Fade to dark.",
  },
];
