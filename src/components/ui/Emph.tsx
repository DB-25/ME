/** Instrument Serif italic accent for one or two emotional words inside a headline. */
export function Emph({ children }: { children: React.ReactNode }) {
  return <em className="font-serif font-normal italic tracking-[-0.02em]">{children}</em>;
}
