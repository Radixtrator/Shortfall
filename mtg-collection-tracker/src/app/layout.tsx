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
  title: "Shortfall",
  description: "Find card conflicts across your Magic: The Gathering decks",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Shortfall",
    description: "Find card conflicts and missing cards across your MTG decks. Track your collection, import from Archidekt, and export buy lists.",
    type: "website",
    siteName: "Shortfall",
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
        <div className="min-h-screen flex flex-col">
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <footer className="border-t border-[#2a2a2a] bg-[#111111] text-xs text-neutral-400">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Shortfall is an independent fan project and is not affiliated with, endorsed, or sponsored by Wizards of the Coast, Archidekt, or Scryfall.
              </p>
              <p className="sm:text-right">
                Magic: The Gathering and all related marks and logos are trademarks of Wizards of the Coast LLC.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
