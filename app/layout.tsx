import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MindMirror",
  description: "A 5-minute AI conversation that reveals your thinking patterns",
  openGraph: {
    title: "MindMirror — Discover how you think",
    description: "A 5-minute AI conversation that reveals your thinking patterns",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "MindMirror — Discover how you think",
    description: "A 5-minute AI conversation that reveals your thinking patterns",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
