import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.radar-daily.com"),
  title: {
    default: "Radar Daily",
    template: "%s | Radar Daily",
  },
  description: "Daily AI product and platform intelligence.",
  applicationName: "Radar Daily",
  keywords: [
    "AI",
    "artificial intelligence",
    "OpenAI",
    "Anthropic",
    "Google",
    "Meta",
    "Hugging Face",
    "AI news",
    "AI products",
    "AI platform intelligence",
  ],
  openGraph: {
    title: "Radar Daily",
    description: "Daily AI product and platform intelligence.",
    siteName: "Radar Daily",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Radar Daily",
    description: "Daily AI product and platform intelligence.",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}