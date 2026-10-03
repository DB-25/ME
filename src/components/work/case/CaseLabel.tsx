/** `01 / THE PROBLEM`: mono section label for case studies. */
export function CaseLabel({ n, text, className = "" }: { n: string; text: string; className?: string }) {
  return (
    <p className={`label ${className}`}>
      <span className="text-accent">{n}</span>
      <span className="mx-2 text-faint">/</span>
      {text}
    </p>
  );
}
