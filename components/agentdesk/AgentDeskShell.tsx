"use client";

import { Menu, Moon, X } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { CubeMark } from "@/components/Hero";

const STEPS = ["Ask", "Details", "Test", "Best match", "Check", "Hire"];

function AmbientBackground() {
  const backgroundImage = process.env.NODE_ENV === "production"
    ? "/images/agentdesk-background-web.webp"
    : "/images/agentdesk-background-hq.webp";

  return <div className="ad-ambient" aria-hidden="true" style={{ "--ad-background-image": `url(${backgroundImage})` } as CSSProperties} />;
}

function AgentDeskNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="ad-navbar">
    <a className="ad-brand" href="/" aria-label="AgentDesk home"><CubeMark /><span>Agent<span>Desk</span></span></a>
    <nav className="ad-nav-links" aria-label="Primary navigation">
      <a className="active" href="/">Marketplace</a><a href="#how-it-works">How it works</a><a href="https://github.com/emmy16-glitch/AgentDesk#readme" target="_blank" rel="noreferrer">For builders</a><a href="/proof/">Docs</a>
    </nav>
    <div className="ad-nav-utility"><Moon size={19} aria-hidden="true" /><button type="button" className="ad-menu-button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
    {menuOpen ? <nav className="ad-mobile-menu" aria-label="Mobile navigation"><a href="/" onClick={() => setMenuOpen(false)}>Marketplace</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="https://github.com/emmy16-glitch/AgentDesk#readme" target="_blank" rel="noreferrer">For builders</a><a href="/proof/">Docs</a></nav> : null}
  </header>;
}

export function ProgressStepper({ step }: { step: number }) {
  const current = STEPS[step - 1];
  return <>
    <ol className="ad-stepper" aria-label="AgentDesk workflow">
      {STEPS.map((label, index) => {
        const number = index + 1;
        return <li key={label} className={number < step ? "complete" : number === step ? "current" : ""} aria-current={number === step ? "step" : undefined}><span>{number < step ? "✓" : number}</span><b>{label}</b></li>;
      })}
    </ol>
    <p className="ad-mobile-step">Step {step} of 6 <span>·</span> {current}</p>
  </>;
}

export default function AgentDeskShell({ step, children }: { step?: number; children: ReactNode }) {
  return <div className="agentdesk-shell"><AmbientBackground /><div className="ad-content"><AgentDeskNavbar />{step ? <ProgressStepper step={step} /> : null}<main className="ad-main">{children}</main></div></div>;
}
