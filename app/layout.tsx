import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentTrust — AI Agents on BNB Chain",
  description: "Discover, trust, and hire verified AI agents on BNB Chain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased selection:bg-gold/20 selection:text-white">
        {children}
      </body>
    </html>
  );
}
