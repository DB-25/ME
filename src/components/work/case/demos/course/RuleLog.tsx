import { RULE_COPY, type Check } from "./rules";

/** The hourly pass, rule by rule, in the order the scheduler asks them. The first failure decides; the rest are never asked. */
export function RuleLog({ checks, stamp }: { checks: Check[]; stamp: string }) {
  const firstFail = checks.find((c) => !c.pass)?.id;
  return (
    <section className="cts-log" aria-labelledby="cts-log-h">
      <div className="cts-log-top">
        <h3 id="cts-log-h" className="label cts-h">Rule log</h3>
        <p className="label cts-log-at">{stamp}</p>
      </div>
      <ol className="cts-log-list">
        {checks.map((c) => {
          const state = !c.reached ? "skipped" : c.pass ? "pass" : "fail";
          return (
            <li key={c.id} className="cts-log-row" data-state={state} data-first={c.id === firstFail || undefined}>
              <i className="cts-dot" aria-hidden />
              <span className="cts-log-rule">{RULE_COPY[c.id].label}</span>
              <span className="cts-log-val">
                {c.reached ? c.value : "Not checked"}
                <span className="sr-only">{state === "pass" ? ", passed" : state === "fail" ? ", blocked the text" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="label cts-log-note">Checked top to bottom. The first rule that fails decides.</p>
    </section>
  );
}
