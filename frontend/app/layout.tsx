import type { Metadata } from "next";
import { Space_Grotesk, Cormorant_Garamond } from "next/font/google";
import { AppProviders } from "@/components/providers";
import { Header } from "@/components/header";
import "@/styles/globals.css";

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "700"]
});

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"]
});

export const metadata: Metadata = {
  title: "ShieldBet",
  description: "Confidential prediction markets on fhEVM"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <AppProviders>
          <div className="bg-shape bg-shape-top" />
          <div className="bg-shape bg-shape-bottom" />
          <main className="page-wrap">
            <Header />
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
