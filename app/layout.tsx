import type { Metadata } from "next";
import { Inter, Sora, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./auditions.css";
import "./hiring.css";
import "./capabilities.css";
import "./category-depth.css";
import "./responsive-hardening.css";
import "./clean-marketplace.css";
import "./agentdesk-flow.css";
import "./check-cleanup.css";
import "./finish-polish.css";
import AppProviders from "@/components/providers/AppProviders";

const bodyFont = Inter({ subsets: ["latin"], display: "swap", variable: "--font-ad-body" });
const accentFont = Sora({ subsets: ["latin"], display: "swap", variable: "--font-ad-accent" });
const headingFont = Space_Grotesk({ subsets: ["latin"], display: "swap", variable: "--font-ad-heading" });

export const metadata: Metadata = {
  title: "AgentDesk — Test AI Agents Before You Trust Them",
  description: "Describe a job, discover live ERC-8004 agents on BNB Chain, audition them against the same task, verify the evidence, and hire deliberately through ERC-8183.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${accentFont.variable} ${headingFont.variable} min-h-screen bg-background antialiased selection:bg-gold/20 selection:text-white`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
