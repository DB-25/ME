import type { Metadata } from "next";
import { Emph } from "@/components/ui/Emph";
import { Ledger } from "@/components/receipts/Ledger";
import { ledger, ledgerProjects } from "@/content/ledger";
import { pageMetadata } from "../page-metadata";

const DESCRIPTION = "Every number and factual claim on this site in one table: what it counts, where it appears, who stands behind it, and where to check.";

export const metadata: Metadata = pageMetadata({ title: "Receipts", description: DESCRIPTION, path: "/receipts/" });

/** /receipts/: the claims ledger. Rows are derived from the site's content, so a number can never be printed here and not there. */
export default function ReceiptsPage() {
  return (
    <section className="shell pb-24 pt-32 md:pb-32">
      <div className="rc-lead [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">
        <p className="label">Receipts / Ledger</p>
        <h1 className="headline mt-6">
          Every number, with its <Emph>receipt</Emph>
        </h1>
        <div className="mt-8 max-w-[62ch] space-y-5 text-[1.0625rem] leading-[1.6] text-muted md:mt-10">
          <p className="!text-ink">
            This is every number and factual claim on this site, in one table. To me a receipt is a claim you can check: what it counts, where on the
            site it appears, who stands behind it, and where to look.
          </p>
          <p>
            Some sources are public, and those link out. Others are my résumé or my own notes. Those are marked Self-reported, because nobody but me
            has checked them, and I would rather show you that gap than hide it. A few rows say Not measured or Designed, not run. Those are things I
            have not proved yet.
          </p>
          <p>
            The rows are not hand-copied. They are generated from the same content files that draw the site, so a figure cannot change in one place and
            stay stale in the other. Where a source gives no date, the table says Undated.
          </p>
        </div>
      </div>
      <Ledger rows={ledger} projects={ledgerProjects} />
    </section>
  );
}
