import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
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
    images: [{ url: "/og-card.png", width: 1200, height: 630, alt: "Customs — the checkpoint for agentic commerce" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Customs — both sides of the agentic counter",
    description:
      "Signed mandates, trust tiers, a channel P&L meter, and a hash-chained audit trail. Test mode only.",
    images: ["/og-card.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

/* Applied before first paint so the saved theme never flashes: the
   night ledger is the default; "light" rides the document root. */
const THEME_BOOT = `(function(){try{var t=localStorage.getItem("customs-theme");if(t!=="dark")document.documentElement.classList.add("light")}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
