import type { Metadata } from "next";
import Link from "next/link";
import { Emph } from "@/components/ui/Emph";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

const LINK_CLASS = "link label inline-flex min-h-11 items-center";
const LINK_STYLE = { color: "var(--color-ink)" };

/** The 404 in the site's own voice: void, ink, one mono label, a line of copy, two ways back. */
export default function NotFound() {
  return (
    <section className="shell flex min-h-svh flex-col justify-center pb-24 pt-32 [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">
      <p className="label">404 / No signal</p>
      <h1 className="headline mt-6 max-w-[14ch]">
        Nothing at this <Emph>address</Emph>.
      </h1>
      <p className="lede mt-6 max-w-[34ch]">That page does not exist, or it moved. The work and the way home are one click away.</p>
      <div className="mt-12 flex max-w-md flex-wrap gap-x-10 gap-y-2 border-t border-hairline pt-4">
        <Link href="/" className={LINK_CLASS} style={LINK_STYLE}>
          Back to home
        </Link>
        <Link href="/#work" className={LINK_CLASS} style={LINK_STYLE}>
          See the work
        </Link>
      </div>
    </section>
  );
}
