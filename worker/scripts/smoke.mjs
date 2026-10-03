// Live smoke test for the Director worker.
//   node scripts/smoke.mjs [url] [message]
//   node scripts/smoke.mjs http://localhost:8787 "I'm a recruiter hiring for infra"
// Prints each NDJSON event as it arrives. Exits non-zero on failure.
const base = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");
// The Worker rejects POSTs without an allowed Origin; localhost:3000 is always allowed.
const origin = process.env.SMOKE_ORIGIN ?? "http://localhost:3000";
const message = process.argv[3] ?? "I'm a recruiter hiring for cloud infrastructure. Show me what matters.";

const health = await fetch(`${base}/health`).catch((e) => ({ ok: false, status: String(e) }));
console.log("health:", health.ok ? await health.json() : health.status);

const started = Date.now();
const res = await fetch(`${base}/director`, {
  method: "POST",
  headers: { "content-type": "application/json", origin },
  body: JSON.stringify({ messages: [{ role: "user", content: message }] }),
});
console.log("status:", res.status, res.headers.get("content-type"));
if (!res.ok || !res.body) {
  console.log(await res.text());
  process.exit(1);
}

const decoder = new TextDecoder();
let buffer = "";
let sawDone = false;
let narration = "";
let actions = 0;
for await (const chunk of res.body) {
  buffer += decoder.decode(chunk, { stream: true });
  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const raw = buffer.slice(0, nl);
    buffer = buffer.slice(nl + 1);
    if (!raw.trim()) continue;
    const event = JSON.parse(raw);
    const t = ((Date.now() - started) / 1000).toFixed(1).padStart(5);
    if (event.type === "text") narration += event.delta;
    if (event.type === "action") actions += 1;
    if (event.type === "done") sawDone = true;
    const shown = event.type === "action" && event.action.name === "draw"
      ? { ...event, action: { ...event.action, args: { label: event.action.args.label, svgBytes: event.action.args.svg.length } } }
      : event;
    console.log(`+${t}s`, JSON.stringify(shown));
  }
}
console.log(`\nnarration: ${narration.trim()}\nwords: ${narration.trim().split(/\s+/).length}, actions: ${actions}, done: ${sawDone}`);
process.exit(sawDone ? 0 : 1);
