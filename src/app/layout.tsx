import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { profile } from "@/content";
import { JsonLd } from "./JsonLd";
import { SITE_ROOT, siteUrl } from "./site";
import { PERSON } from "./structured-data";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { SignalMount } from "@/components/signal/SignalMount";
import { Chrome } from "@/components/chrome/Chrome";
import "./globals.css";

/*
 * Fallback faces tuned to each web font, so the swap moves nothing. next/font's automatic fallback sizes Arial from the
 * font's average glyph width, which is 3 to 4% too wide for Geist text and about 35% too wide for Geist Mono capitals
 * (a one-line label wrapped to two, then the bottom-anchored hero jumped 15px when the font arrived: CLS 0.21 on a
 * slow phone). The size-adjust values below come from measuring the real hero and label strings in each font
 * against the local face; ascent and descent keep the font's own line box. Re-measure if the copy's character changes.
 */
const LOCAL_SANS = "local(Arial), local(Arimo), local('Liberation Sans'), local(Helvetica)";
const LOCAL_SERIF_ITALIC = "local('Times New Roman Italic'), local('TimesNewRomanPS-ItalicMT'), local('Tinos Italic'), local('Liberation Serif Italic')";
const FALLBACK_ASCENT = 1.005;
const FALLBACK_DESCENT = 0.295;
const SERIF_ASCENT = 0.99;
const SERIF_DESCENT = 0.31;

function fallbackFace(family: string, src: string, style: string, weight: string, sizeAdjust: number, ascent: number, descent: number) {
  const pct = (v: number) => `${((v / sizeAdjust) * 100).toFixed(2)}%`;
  return `@font-face{font-family:'${family}';src:${src};font-style:${style};font-weight:${weight};size-adjust:${(sizeAdjust * 100).toFixed(1)}%;ascent-override:${pct(ascent)};descent-override:${pct(descent)};line-gap-override:0%}`;
}

const FALLBACK_CSS = [
  fallbackFace("Geist Fit", LOCAL_SANS, "normal", "100 450", 1.016, FALLBACK_ASCENT, FALLBACK_DESCENT),
  fallbackFace("Geist Fit", LOCAL_SANS, "normal", "451 900", 1.039, FALLBACK_ASCENT, FALLBACK_DESCENT),
  fallbackFace("Geist Mono Fit", LOCAL_SANS, "normal", "100 900", 0.99, FALLBACK_ASCENT, FALLBACK_DESCENT),
  fallbackFace("Instrument Serif Fit", LOCAL_SERIF_ITALIC, "italic", "400", 0.869, SERIF_ASCENT, SERIF_DESCENT),
].join("");

const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap", adjustFontFallback: false, fallback: ["Geist Fit", "ui-sans-serif", "system-ui", "sans-serif"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Geist Mono Fit", "ui-monospace", "monospace"],
});
// Italic only: the second voice is never set upright, so the upright file is not shipped or preloaded.
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Instrument Serif Fit", "ui-serif", "Georgia", "serif"],
});

const TITLE = `${profile.name}, ${profile.title}`;
const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: TITLE };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ROOT),
  alternates: { canonical: "/" },
  title: { default: TITLE, template: `%s | ${profile.shortName}` },
  description: profile.oneLiner,
  authors: [{ name: profile.name }],
  openGraph: { title: TITLE, description: profile.oneLiner, type: "website", url: siteUrl("/"), images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: profile.oneLiner, images: [OG_IMAGE.url] },
};

export const viewport: Viewport = { themeColor: "#060509", colorScheme: "dark", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrument.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: FALLBACK_CSS }} />
      </head>
      <body>
        <JsonLd data={PERSON} />
        <SmoothScroll />
        <SignalMount />
        <Chrome />
        <main id="main" className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
