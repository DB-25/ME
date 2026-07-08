import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { GrainOverlay } from "@/components/layout/GrainOverlay";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dhruv Kamalesh Kumar — Software Engineer",
  description:
    "Software engineer with 5+ years shipping production systems — from mobile apps with 20K+ daily users to AI platforms serving 500K+ people across 20+ government agencies. Explore my work through an AI command center.",
  keywords: [
    "Dhruv Kamalesh Kumar",
    "Software Engineer",
    "Gen AI Engineer",
    "Distributed Systems",
    "AWS",
    "LLM",
    "RAG",
    "AWS Bedrock",
    "Burnes Center",
    "Northeastern University",
  ],
  authors: [{ name: "Dhruv Kamalesh Kumar" }],
  openGraph: {
    title: "Dhruv Kamalesh Kumar — Software Engineer",
    description:
      "5+ years shipping production software. Now building AI at scale — 500K+ people, 20+ agencies, 26 tools.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dhruv Kamalesh Kumar — Software Engineer",
    description: "Software that ships at scale.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <GrainOverlay />
      </body>
    </html>
  );
}
