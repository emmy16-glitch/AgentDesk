"use client";

import { Check, Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const menu = mobileMenuRef.current;
    const links = Array.from(menu?.querySelectorAll<HTMLAnchorElement>("a") ?? []);
    links[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }

      if (event.key !== "Tab" || !links.length) return;
      const first = links[0];
      const last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target || menu?.contains(target) || menuButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen]);

  return <header className="ad-navbar">
    <a className="ad-brand" href="/" aria-label="AgentDesk home"><CubeMark /><span>Agent<span>Desk</span></span></a>
    <nav className="ad-nav-links" aria-label="Primary navigation">
      <a className="active" href="/">Marketplace</a><a href="#how-it-works">How it works</a><a href="https://github.com/emmy16-glitch/AgentDesk#readme" target="_blank" rel="noreferrer">For builders</a><a href="/proof/">Docs</a>
    </nav>
    <div className="ad-nav-utility"><button ref={menuButtonRef} type="button" className="ad-menu-button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="agentdesk-mobile-menu" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
    {menuOpen ? <nav ref={mobileMenuRef} id="agentdesk-mobile-menu" className="ad-mobile-menu" aria-label="Mobile navigation"><a href="/" onClick={() => setMenuOpen(false)}>Marketplace</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="https://github.com/emmy16-glitch/AgentDesk#readme" target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>For builders</a><a href="/proof/" onClick={() => setMenuOpen(false)}>Docs</a></nav> : null}
  </header>;
}

export function ProgressStepper({ step }: { step: number }) {
  const current = STEPS[step - 1];
  return <>
    <ol className="ad-stepper" aria-label="AgentDesk workflow">
      {STEPS.map((label, index) => {
        const number = index + 1;
        return <li key={label} className={number < step ? "complete" : number === step ? "current" : ""} aria-current={number === step ? "step" : undefined}><span>{number < step ? <Check size={14} aria-hidden="true" /> : number}</span><b>{label}</b></li>;
      })}
    </ol>
    <p className="ad-mobile-step">Step {step} of 6 <span>·</span> {current}</p>
  </>;
}

export default function AgentDeskShell({ step, children }: { step?: number; children: ReactNode }) {
  return <div className="agentdesk-shell"><AmbientBackground /><div className="ad-content"><AgentDeskNavbar />{step ? <ProgressStepper step={step} /> : null}<main className="ad-main">{children}</main></div></div>;
}
