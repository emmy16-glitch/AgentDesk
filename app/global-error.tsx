"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#090909", color: "#f5f5f5", padding: 24 }}>
          <section style={{ width: "min(620px, 100%)", border: "1px solid #2f2f2f", borderRadius: 20, padding: 28, background: "#111" }}>
            <p style={{ margin: 0, color: "#d8ad4f", fontSize: 12, letterSpacing: ".12em", fontWeight: 700 }}>AGENTDESK</p>
            <h1 style={{ margin: "12px 0 8px", fontSize: 30 }}>This view could not be rendered safely.</h1>
            <p style={{ margin: "0 0 22px", color: "#aaa", lineHeight: 1.6 }}>
              No substitute agent, quote, hire, or completion evidence has been generated. Retry the real request or return to the marketplace.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="button" onClick={reset} style={{ border: 0, borderRadius: 12, padding: "11px 16px", fontWeight: 700, cursor: "pointer" }}>
                Retry
              </button>
              <a href="/" style={{ border: "1px solid #444", borderRadius: 12, padding: "10px 16px", color: "#f5f5f5", textDecoration: "none" }}>
                Back to AgentDesk
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
