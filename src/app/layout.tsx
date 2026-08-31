import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Customs — both sides of the agentic counter",
  description:
    "A two-sided agentic checkout: the storefront AI buyers transact on, and the merchant desk that lets a payments company trust them — bounded, metered, replayable, provable in 60 seconds. Razorpay AI Buildathon 2026, Track 1. Test mode only.",
  keywords: [
    "agentic commerce",
    "agentic checkout",
    "Razorpay",
    "AI payments",
    "mandates",
    "agent payments",
    "MCP",
    "ACP",
  ],
  authors: [{ name: "srivtx" }],
  openGraph: {
    title: "Customs — both sides of the agentic counter",
    description:
      "Signed mandates, trust tiers, a channel P&L meter, and a hash-chained audit trail. Provable to a machine in 60 seconds.",
    siteName: "Customs",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f3ec",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased bg-background text-foreground grain`}
      >
        {children}
      </body>
    </html>
  );
}
