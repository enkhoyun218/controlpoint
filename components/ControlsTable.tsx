"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

import { EvidencePill, RiskPill, StatusPill } from "@/components/StatusPills";
import type {
  ControlStatus,
  EvidenceStatus,
  RiskLevel,
} from "@/lib/data";

export type ControlRow = {
  id: string;
  title: string;
  description: string;
  criteria: string[];
  categories: string[];
  status: ControlStatus;
  evidence: EvidenceStatus;
  evidenceType: string;
  owner: string;
  frequency: string;
  lastTested: string | null;
  lastTestedLabel: string;
  daysSinceTested: number | null;
  expectedEvidenceIntervalDays: number;
  inherentRisk: RiskLevel;
};

type SortKey =
  | "id"
  | "title"
  | "status"
  | "evidence"
  | "owner"
  | "frequency"
  | "lastTested"
  | "inherentRisk";

const STATUS_ORDER: Record<ControlStatus, number> = {
  not_implemented: 0,
  partial: 1,
  implemented: 2,
};
const EVIDENCE_ORDER: Record<EvidenceStatus, number> = {
  missing: 0,
  stale: 1,
  current: 2,
};
const RISK_ORDER: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };

const ALL = "all";

function selectClass() {
  return "rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent";
}

export default function ControlsTable({
  rows,
  categories,
  owners,
}: {
  rows: ControlRow[];
  categories: string[];
  owners: string[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [evidence, setEvidence] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [risk, setRisk] = useState<string>(ALL);
  const [owner, setOwner] = useState<string>(ALL);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (status !== ALL && r.status !== status) return false;
      if (evidence !== ALL && r.evidence !== evidence) return false;
      if (risk !== ALL && r.inherentRisk !== risk) return false;
      if (owner !== ALL && r.owner !== owner) return false;
      if (category !== ALL && !r.categories.includes(category)) return false;
      if (q) {
        const haystack =
          `${r.id} ${r.title} ${r.description} ${r.owner} ${r.criteria.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (preset) out = out.filter(PRESETS[preset].predicate);

    const dir = sortDir === "asc" ? 1 : -1;
    return [...out].sort((a, b) => {
      switch (sortKey) {
        case "status":
          return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir;
        case "evidence":
          return (EVIDENCE_ORDER[a.evidence] - EVIDENCE_ORDER[b.evidence]) * dir;
        case "inherentRisk":
          return (RISK_ORDER[a.inherentRisk] - RISK_ORDER[b.inherentRisk]) * dir;
        case "lastTested":
          return (
            ((a.daysSinceTested ?? Number.MAX_SAFE_INTEGER) -
              (b.daysSinceTested ?? Number.MAX_SAFE_INTEGER)) *
            dir *
            -1
          );
        case "title":
        case "owner":
        case "frequency":
          return a[sortKey].localeCompare(b[sortKey]) * dir;
        default:
          return a.id.localeCompare(b.id) * dir;
      }
    });
  }, [rows, query, status, evidence, category, risk, owner, preset, sortKey, sortDir]);

  const anyFilter =
    query !== "" ||
    status !== ALL ||
    evidence !== ALL ||
    category !== ALL ||
    risk !== ALL ||
    owner !== ALL ||
    preset !== null;

  function reset() {
    setQuery("");
    setStatus(ALL);
    setEvidence(ALL);
    setCategory(ALL);
    setRisk(ALL);
    setOwner(ALL);
    setPreset(null);
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(Object.keys(PRESETS) as Preset[]).map((key) => {
          const active = preset === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(active ? null : key)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-surface text-ink-muted hover:border-[#bcd7e2] hover:text-ink"
              }`}
            >
              {PRESETS[key].label}
              <span className="num ml-1.5 opacity-70">
                {rows.filter(PRESETS[key].predicate).length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search controls, owners, criteria"
            aria-label="Search controls"
            className="w-64 rounded-lg border border-line bg-surface py-1.5 pr-2.5 pl-8 text-xs focus:border-accent"
          />
        </label>

        <select
          aria-label="Filter by criteria category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={selectClass()}
        >
          <option value={ALL}>All criteria</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by implementation status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={selectClass()}
        >
          <option value={ALL}>Any status</option>
          <option value="implemented">Implemented</option>
          <option value="partial">Partially implemented</option>
          <option value="not_implemented">Not implemented</option>
        </select>

        <select
          aria-label="Filter by evidence status"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          className={selectClass()}
        >
          <option value={ALL}>Any evidence</option>
          <option value="current">Evidence current</option>
          <option value="stale">Evidence stale</option>
          <option value="missing">Evidence missing</option>
        </select>

        <select
          aria-label="Filter by inherent risk"
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
          className={selectClass()}
        >
          <option value={ALL}>Any inherent risk</option>
          <option value="high">High risk</option>
          <option value="medium">Medium risk</option>
          <option value="low">Low risk</option>
        </select>

        <select
          aria-label="Filter by control owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className={selectClass()}
        >
          <option value={ALL}>Any owner</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        {anyFilter ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-muted hover:text-ink"
          >
            <X className="h-3 w-3" aria-hidden />
            Clear
          </button>
        ) : null}

        <p className="num ml-auto text-xs text-ink-muted">
          {filtered.length} of {rows.length} controls
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas text-left">
              <Th onClick={() => toggleSort("id")} active={sortKey === "id"} dir={sortDir}>
                ID
              </Th>
              <Th onClick={() => toggleSort("title")} active={sortKey === "title"} dir={sortDir}>
                Control
              </Th>
              <th className="px-3 py-2.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
                Criteria
              </th>
              <Th onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir}>
                Status
              </Th>
              <Th onClick={() => toggleSort("evidence")} active={sortKey === "evidence"} dir={sortDir}>
                Evidence
              </Th>
              <Th onClick={() => toggleSort("owner")} active={sortKey === "owner"} dir={sortDir}>
                Owner
              </Th>
              <Th onClick={() => toggleSort("frequency")} active={sortKey === "frequency"} dir={sortDir}>
                Frequency
              </Th>
              <Th onClick={() => toggleSort("lastTested")} active={sortKey === "lastTested"} dir={sortDir}>
                Last evidenced
              </Th>
              <Th onClick={() => toggleSort("inherentRisk")} active={sortKey === "inherentRisk"} dir={sortDir}>
                Inherent risk
              </Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const flagged =
                row.status === "not_implemented" || row.evidence !== "current";
              const isExpanded = expanded === row.id;
              return (
                <tr
                  key={row.id}
                  onClick={() => setExpanded(isExpanded ? null : row.id)}
                  className={`cursor-pointer border-b border-line align-top last:border-b-0 hover:bg-canvas ${
                    flagged ? "bg-[#fffbf5]" : ""
                  }`}
                >
                  <td className="num px-3 py-3 font-medium whitespace-nowrap">
                    <span
                      className={`mr-2 inline-block h-3 w-0.5 translate-y-[2px] rounded ${
                        row.status === "not_implemented"
                          ? "bg-rose-600"
                          : row.evidence !== "current"
                            ? "bg-amber-500"
                            : "bg-transparent"
                      }`}
                      aria-hidden
                    />
                    {row.id}
                  </td>
                  <td className="max-w-[380px] px-3 py-3">
                    <span className="flex items-start gap-1.5 font-medium">
                      {row.title}
                      {isExpanded ? (
                        <ChevronUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
                      ) : (
                        <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden />
                      )}
                    </span>
                    {isExpanded ? (
                      <span className="mt-1.5 block text-xs leading-5 text-ink-muted">
                        {row.description}
                        <span className="mt-1.5 block">
                          <span className="font-semibold text-ink">
                            Evidence an auditor would request:
                          </span>{" "}
                          {row.evidenceType}. Expected no older than{" "}
                          <span className="num">
                            {row.expectedEvidenceIntervalDays}
                          </span>{" "}
                          days for a {row.frequency} control.
                        </span>
                      </span>
                    ) : null}
                  </td>
                  <td className="num px-3 py-3 text-xs whitespace-nowrap text-ink-muted">
                    {row.criteria.join(", ")}
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-3 py-3">
                    <EvidencePill evidence={row.evidence} />
                  </td>
                  <td className="px-3 py-3 text-xs">{row.owner}</td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap capitalize">
                    {row.frequency}
                  </td>
                  <td className="num px-3 py-3 text-xs whitespace-nowrap">
                    {row.lastTestedLabel}
                    {row.daysSinceTested !== null ? (
                      <span
                        className={`mt-0.5 block ${
                          row.daysSinceTested > row.expectedEvidenceIntervalDays
                            ? "font-semibold text-amber-700"
                            : "text-ink-muted"
                        }`}
                      >
                        {row.daysSinceTested}d ago
                      </span>
                    ) : (
                      <span className="mt-0.5 block font-semibold text-rose-700">
                        never
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <RiskPill risk={row.inherentRisk} />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-sm text-ink-muted">
                  No controls match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <th className="px-3 py-2.5 text-[11px] font-semibold tracking-wide text-ink-muted uppercase">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 uppercase hover:text-ink ${
          active ? "text-ink" : ""
        }`}
      >
        {children}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3 w-3" aria-hidden />
          ) : (
            <ChevronDown className="h-3 w-3" aria-hidden />
          )
        ) : null}
      </button>
    </th>
  );
}

type Preset = "evidenceGap" | "notImplemented" | "highRiskOpen";

const PRESETS: Record<
  Preset,
  { label: string; predicate: (r: ControlRow) => boolean }
> = {
  evidenceGap: {
    label: "Evidence stale or missing",
    predicate: (r) => r.evidence !== "current",
  },
  notImplemented: {
    label: "Not fully implemented",
    predicate: (r) => r.status !== "implemented",
  },
  highRiskOpen: {
    label: "Open high-risk",
    predicate: (r) =>
      r.inherentRisk === "high" &&
      (r.status !== "implemented" || r.evidence !== "current"),
  },
};
