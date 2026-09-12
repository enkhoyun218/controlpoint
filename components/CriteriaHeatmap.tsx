"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { EvidencePill, RiskPill, StatusPill } from "@/components/StatusPills";
import type { ControlStatus, EvidenceStatus, RiskLevel } from "@/lib/data";

export type ControlBrief = {
  id: string;
  title: string;
  status: ControlStatus;
  evidence: EvidenceStatus;
  owner: string;
  inherentRisk: RiskLevel;
  lastTested: string;
};

export type CriterionCell = {
  id: string;
  intent: string;
  coverage: number;
  controls: ControlBrief[];
};

export type CategoryBlock = {
  id: string;
  name: string;
  summary: string;
  tsc: string;
  coverage: number;
  criteria: CriterionCell[];
};

/** Four coverage bands. The written percentage in each cell carries the meaning; color only reinforces it. */
function band(v: number) {
  if (v >= 85) return "bg-emerald-600 text-white border-emerald-700";
  if (v >= 70) return "bg-emerald-100 text-emerald-900 border-emerald-300";
  if (v >= 50) return "bg-amber-100 text-amber-900 border-amber-300";
  if (v > 0) return "bg-rose-100 text-rose-900 border-rose-300";
  return "bg-rose-600 text-white border-rose-700";
}

export default function CriteriaHeatmap({
  categories,
}: {
  categories: CategoryBlock[];
}) {
  const [selectedId, setSelectedId] = useState<string>(
    // Open on the weakest criterion — where an auditor would look first.
    [...categories.flatMap((c) => c.criteria)].sort(
      (a, b) => a.coverage - b.coverage,
    )[0]?.id ?? "",
  );

  const selected = categories
    .flatMap((c) => c.criteria.map((crit) => ({ ...crit, category: c })))
    .find((c) => c.id === selectedId);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-2.5">
        {categories.map((category) => (
          <div
            key={category.id}
            className="rounded-xl border border-line bg-surface p-4"
          >
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div>
                <h3 className="text-sm font-semibold">
                  <span className="text-accent">{category.id}</span> ·{" "}
                  {category.name}
                </h3>
                <p className="mt-0.5 text-[11px] leading-4 text-ink-muted">
                  {category.summary}
                </p>
              </div>
              <p className="num text-sm font-semibold">
                {category.coverage.toFixed(0)}%
                <span className="ml-1 text-[11px] font-normal text-ink-muted">
                  coverage
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {category.criteria.map((criterion) => {
                const active = criterion.id === selectedId;
                return (
                  <button
                    key={criterion.id}
                    type="button"
                    onClick={() => setSelectedId(criterion.id)}
                    aria-pressed={active}
                    title={criterion.intent}
                    className={`num min-w-[76px] rounded-lg border px-2.5 py-2 text-left transition-[outline] ${band(
                      criterion.coverage,
                    )} ${active ? "outline-2 outline-offset-2 outline-ink" : ""}`}
                  >
                    <span className="block text-[11px] font-semibold">
                      {criterion.id}
                    </span>
                    <span className="block text-sm font-semibold">
                      {criterion.coverage.toFixed(0)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        {selected ? (
          <div className="rounded-xl border border-line bg-surface">
            <header className="border-b border-line px-4 py-3">
              <p className="text-[11px] font-semibold tracking-wider text-accent uppercase">
                {selected.category.id} · {selected.category.name}
              </p>
              <h3 className="num mt-1 text-lg font-semibold">{selected.id}</h3>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                {selected.intent}
              </p>
              <p className="num mt-2 text-sm font-semibold">
                {selected.coverage.toFixed(0)}% coverage ·{" "}
                <span className="font-normal text-ink-muted">
                  {selected.controls.length} control
                  {selected.controls.length === 1 ? "" : "s"} mapped
                </span>
              </p>
            </header>

            <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
              {selected.controls.map((control) => (
                <li key={control.id} className="px-4 py-3">
                  <p className="num text-[11px] font-semibold text-ink-muted">
                    {control.id} · {control.owner}
                  </p>
                  <p className="mt-0.5 text-sm leading-5 font-medium">
                    {control.title}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusPill status={control.status} />
                    <EvidencePill evidence={control.evidence} />
                    <RiskPill risk={control.inherentRisk} />
                  </div>
                  <p className="num mt-1.5 text-[11px] text-ink-muted">
                    Last evidenced {control.lastTested}
                  </p>
                </li>
              ))}
              {selected.controls.length === 0 ? (
                <li className="px-4 py-6 text-sm text-ink-muted">
                  No control is mapped to this criterion — an unaddressed
                  criterion scores zero rather than being skipped.
                </li>
              ) : null}
            </ul>

            <footer className="border-t border-line px-4 py-3">
              <Link
                href="/controls"
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
              >
                Open these in the control register
                <ArrowUpRight className="h-3 w-3" aria-hidden />
              </Link>
            </footer>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
