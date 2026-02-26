import type { Metadata } from "next";
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
  title: "Deckflict",
  description: "Find card conflicts across your Magic: The Gathering decks",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Deckflict",
    description: "Find card conflicts and missing cards across your MTG decks. Track your collection, import from Archidekt, and export buy lists.",
    type: "website",
    siteName: "Deckflict",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
