import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";

export const metadata: Metadata = {
  title: "AgentDesk — Audition AI Agents on BNB Chain",
  description: "Discover source-backed ERC-8004 agents on BNB Chain, inspect their evidence, and audition task fit before hiring.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased selection:bg-gold/20 selection:text-white">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
