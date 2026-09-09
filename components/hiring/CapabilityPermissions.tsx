"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { PAID_TOOL_CATALOG } from "@/lib/capabilities/catalog";
import { capabilityPolicySummary } from "@/lib/capabilities/policy";
import type { HireCapabilityPolicy, PaidToolId } from "@/lib/capabilities/types";

interface Props {
  value: HireCapabilityPolicy;
  onChange: (next: HireCapabilityPolicy) => void;
  locked?: boolean;
}

const TOOL_BUDGETS = ["0.05", "0.10", "0.25", "1.00"] as const;

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return <div className="hire-permission-row">
    <div><strong>{label}</strong><small>{description}</small></div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`hire-permission-switch ${checked ? "on" : ""}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span />
      <b>{checked ? "On" : "Off"}</b>
    </button>
  </div>;
}

export default function CapabilityPermissions({ value, onChange, locked = false }: Props) {
  const [open, setOpen] = useState(false);

  function setExternalIntelligence(enabled: boolean) {
    onChange({
      ...value,
      externalIntelligence: enabled,
      ...(enabled ? {} : { paidIntelligence: false, approvedPaidTools: [], maxToolSpend: undefined }),
    });
  }

  function setPaidIntelligence(enabled: boolean) {
    onChange(enabled
      ? {
          ...value,
          externalIntelligence: true,
          paidIntelligence: true,
          approvedPaidTools: value.approvedPaidTools.length ? value.approvedPaidTools : ["cournot", "telegraph"],
          maxToolSpend: value.maxToolSpend ?? { amount: "0.10", asset: "$U" },
        }
      : {
          ...value,
          paidIntelligence: false,
          approvedPaidTools: [],
          maxToolSpend: undefined,
        });
  }

  function toggleTool(id: PaidToolId) {
    if (!value.paidIntelligence) return;
    const exists = value.approvedPaidTools.includes(id);
    const nextTools = exists
      ? value.approvedPaidTools.filter((tool) => tool !== id)
      : [...value.approvedPaidTools, id];
    if (!nextTools.length) return;
    onChange({ ...value, approvedPaidTools: nextTools });
  }

  function setBudget(amount: string) {
    onChange({ ...value, maxToolSpend: { amount, asset: "$U" } });
  }

  const summary = capabilityPolicySummary(value);

  return <section className={`hire-capabilities ${open ? "open" : ""}`} aria-label="Capabilities and permissions">
    <button
      type="button"
      className="hire-capabilities-summary"
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
    >
      <span className="hire-capabilities-title"><ShieldCheck size={16} /><span><strong>Capabilities &amp; permissions</strong><small>{summary.slice(0, 2).join(" · ")}</small></span></span>
      <span className="hire-capabilities-review">{open ? "Close" : "Review"}</span>
    </button>

    {open ? <div className="hire-capabilities-panel">
      <ToggleRow
        label="External intelligence"
        description="Allow read-only research from outside sources when it helps the task."
        checked={value.externalIntelligence}
        disabled={locked}
        onChange={setExternalIntelligence}
      />
      <ToggleRow
        label="Paid intelligence"
        description="Off by default. Turning this on does not charge you; a fee can occur only if the hired agent later calls an approved paid service."
        checked={value.paidIntelligence}
        disabled={locked}
        onChange={setPaidIntelligence}
      />

      {value.paidIntelligence ? <div className="hire-paid-settings">
        <div className="hire-paid-setting">
          <span><strong>Maximum tool spend</strong><small>Per hired task, not per click.</small></span>
          <div className="hire-budget-options" role="radiogroup" aria-label="Maximum paid intelligence spend">
            {TOOL_BUDGETS.map((amount) => <button
              key={amount}
              type="button"
              role="radio"
              aria-checked={value.maxToolSpend?.amount === amount}
              className={value.maxToolSpend?.amount === amount ? "active" : ""}
              disabled={locked}
              onClick={() => setBudget(amount)}
            >{amount} $U</button>)}
          </div>
        </div>

        <div className="hire-paid-setting">
          <span><strong>Approved intelligence</strong><small>The agent may only pay providers you leave enabled.</small></span>
          <div className="hire-tool-options">
            {PAID_TOOL_CATALOG.map((tool) => {
              const active = value.approvedPaidTools.includes(tool.id);
              return <button
                key={tool.id}
                type="button"
                role="checkbox"
                aria-checked={active}
                className={active ? "active" : ""}
                disabled={locked}
                onClick={() => toggleTool(tool.id)}
                title={tool.description}
              >{active ? <Check size={13} /> : null}{tool.label}</button>;
            })}
          </div>
        </div>
      </div> : null}

      <div className="hire-permission-row readonly">
        <div><strong>Transactions</strong><small>The task’s action rule cannot be made more permissive at hire time.</small></div>
        <span>{value.execution === "approval-required" ? "Ask first" : "Off"}</span>
      </div>

      <p className="hire-capability-note">Auditions stay free and read-only. AgentDesk does not spend on Cournot, Telegraph or another paid tool before the hire.</p>
      {locked ? <p className="hire-capability-locked">These permissions are locked because the provider has already signed terms for this policy. Refresh terms to change them.</p> : null}
    </div> : null}
  </section>;
}
