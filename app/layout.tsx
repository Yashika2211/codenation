import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Fonts are self-hosted rather than fetched through `next/font/google`.
 *
 * The Google loader resolves over the network *at build time*, and a failed or
 * unexpected response there fails the whole build — which is exactly what
 * happened in CI. Shipping the woff2 files makes the build deterministic and
 * offline-capable, and drops a third-party request at runtime.
 *
 * These are the variable cuts, so one file covers every weight the design
 * system uses.
 */

const syne = localFont({
  src: "./fonts/Syne-Variable.woff2",
  weight: "700 800",
  style: "normal",
  variable: "--font-syne",
  display: "swap",
  preload: true,
});

const manrope = localFont({
  src: "./fonts/Manrope-Variable.woff2",
  weight: "400 800",
  style: "normal",
  variable: "--font-manrope",
  display: "swap",
  preload: true,
});

const jetbrains = localFont({
  src: "./fonts/JetBrainsMono-Variable.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-jetbrains",
  display: "swap",
  preload: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "CodeNation — Ship code. Found a nation.",
    template: "%s · CodeNation",
  },
  description:
    "A persistent world for developers. Solved challenges, rated duels and merged contributions mint reputation, territory and technology.",
  applicationName: "CodeNation",
  openGraph: {
    type: "website",
    siteName: "CodeNation",
    title: "CodeNation — Ship code. Found a nation.",
    description:
      "Real work mints in-world resources. Reputation unlocks territory, buildings, technologies and the Forge.",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeNation — Ship code. Found a nation.",
    description:
      "Real work mints in-world resources. Reputation unlocks territory, buildings, technologies and the Forge.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#06070D",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${manrope.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-void text-text antialiased">{children}</body>
    </html>
  );
}
