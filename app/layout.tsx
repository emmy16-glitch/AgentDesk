import type { Metadata } from "next";
// Self-hosted Inter (no external font requests at runtime).
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-800.css";
import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";

export const metadata: Metadata = {
  title: "AgentTrust — AI Agents on BNB Chain",
  description: "Discover, trust, and hire verified AI agents on BNB Chain.",
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
