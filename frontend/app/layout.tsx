import type { Metadata } from "next";
import { AppProviders } from "@/components/providers";
import { AppShell } from "@/components/app-shell";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "ShieldBet | Confidential Prediction Markets",
  description: "Prediction markets with encrypted side selection powered by Zama fhEVM and Lit-backed verification flows."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
