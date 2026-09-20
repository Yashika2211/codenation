import type { Metadata, Viewport } from "next";
import { Syne, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
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
