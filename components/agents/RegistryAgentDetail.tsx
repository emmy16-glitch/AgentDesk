import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, ShieldCheck, UserRound } from "lucide-react";
import type { OnChainAgentIdentity } from "@/lib/erc8004-registry";

export default function RegistryAgentDetail({ identity }: { identity: OnChainAgentIdentity }) {
  const metadata = identity.metadata;
  const name = metadata?.name?.trim() || `ERC-8004 Agent #${identity.tokenId}`;
  const description = metadata?.description?.trim() || "No description was resolved from this agent's registration document.";
  const supportedTrust = Array.isArray(metadata?.supportedTrust)
    ? metadata.supportedTrust.filter((value): value is string => typeof value === "string")
    : [];

  return <main className="detail-shell">
    <Link className="detail-back" href="/"><ArrowLeft size={16} /> Marketplace</Link>
    <div className="detail-grid">
      <section className="detail-primary">
        <div className="detail-identity">
          <div className="detail-icon" style={{ backgroundColor: "#2b2f3a" }}><ShieldCheck size={42} /></div>
          <div>
            <p>ERC-8004 identity #{identity.tokenId}</p>
            <h1>{name}</h1>
            <span>Registered on BNB Smart Chain mainnet · chain 56</span>
          </div>
        </div>

        <p className="detail-description">{description}</p>

        <section className="detail-section">
          <h2>Registry proof</h2>
          <ul className="detail-capabilities">
            <li><Check size={16} />Identity Registry: {short(identity.registryAddress)}</li>
            <li><Check size={16} />Current owner: {short(identity.owner)}</li>
            <li><Check size={16} />Agent wallet: {identity.agentWallet ? short(identity.agentWallet) : "Not currently verified / unavailable"}</li>
            <li><Check size={16} />Metadata: {identity.metadataStatus}</li>
          </ul>
        </section>

        <section className="detail-section metrics-section">
          <h2>Advertised services</h2>
          {identity.services.length ? <div>
            {identity.services.map((service, index) => <div key={`${service.name}:${service.endpoint}:${index}`} style={{ marginBottom: 14 }}>
              <strong>{service.name}</strong>{service.version ? <small> · {service.version}</small> : null}
              <p className="detail-description" style={{ marginTop: 4, wordBreak: "break-all" }}>{service.endpoint}</p>
            </div>)}
          </div> : <p className="detail-description">No valid service endpoints were resolved from the ERC-8004 registration document.</p>}
        </section>

        <section className="detail-section">
          <h2>Declared trust support</h2>
          {supportedTrust.length ? <ul className="detail-capabilities">{supportedTrust.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul> : <p className="detail-description">No supportedTrust values were published in the resolved registration metadata.</p>}
        </section>

        <section className="detail-section">
          <h2>Provenance</h2>
          <p className="detail-description">Read directly from the BSC ERC-8004 Identity Registry and its referenced registration metadata. Last checked {new Date(identity.checkedAt).toLocaleString()}.</p>
          <p className="detail-description" style={{ wordBreak: "break-all" }}>Agent URI: {identity.agentUri || "No URI"}</p>
        </section>
      </section>

      <aside className="detail-sidebar">
        <section className="detail-purchase">
          <span>Current marketplace state</span>
          <strong>Identity verified</strong>
          <small>Endpoint reachability is not implied by registration.</small>
          <button type="button" className="detail-hire" disabled title="Live task auditions are Phase 2">Audition in Phase 2</button>
        </section>
        <section className="developer-card">
          <h2><UserRound size={18} /> On-chain owner</h2>
          <p><b>{short(identity.owner)}</b></p>
          <a href={identity.explorerUrl} target="_blank" rel="noreferrer">Verify on 8004scan <ExternalLink size={13} /></a>
        </section>
      </aside>
    </div>
  </main>;
}

function short(value: string) {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}
