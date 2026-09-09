import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import "./auditions.css";
import "./hiring.css";
import "./category-depth.css";
import "./responsive-hardening.css";
import "./clean-marketplace.css";
import "./agentdesk-flow.css";
import AppProviders from "@/components/providers/AppProviders";

export const metadata: Metadata = {
  title: "AgentDesk — Audition AI Agents on BNB Chain",
  description: "Discover source-backed ERC-8004 agents on BNB Chain, audition them on your exact task, compare live evidence, and hire the best fit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} min-h-screen bg-background antialiased selection:bg-gold/20 selection:text-white`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
