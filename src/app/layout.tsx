import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { profile } from "@/content";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { SignalMount } from "@/components/signal/SignalMount";
import { Chrome } from "@/components/chrome/Chrome";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://db25.dev";
const TITLE = `${profile.name}, ${profile.title}`;
const OG_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: TITLE };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s | ${profile.shortName}` },
  description: profile.oneLiner,
  authors: [{ name: profile.name }],
  openGraph: { title: TITLE, description: profile.oneLiner, type: "website", url: SITE_URL, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: profile.oneLiner, images: [OG_IMAGE.url] },
};

export const viewport: Viewport = { themeColor: "#060509", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrument.variable}`}>
      <body>
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
