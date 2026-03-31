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
  title: "Dhruv Kamalesh Kumar — Gen AI Engineer",
  description:
    "Generative AI Engineer building production LLM systems for government. 26 AI tools, 20+ agencies, 500K+ users served. Explore my work through an AI-powered interactive experience.",
  keywords: [
    "Dhruv Kamalesh Kumar",
    "Gen AI Engineer",
    "LLM",
    "RAG",
    "AWS Bedrock",
    "AI for Impact",
    "Burnes Center",
    "Northeastern University",
  ],
  authors: [{ name: "Dhruv Kamalesh Kumar" }],
  openGraph: {
    title: "Dhruv Kamalesh Kumar — Gen AI Engineer",
    description:
      "Building AI That Matters. 26 AI tools for 20+ government agencies serving 500K+ users.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dhruv Kamalesh Kumar — Gen AI Engineer",
    description: "Building AI That Matters.",
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
