"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

import GapCard from "@/components/GapCard";
import { Card, MethodNote } from "@/components/ui";
import type { Gap, Projection } from "@/lib/remediation";

export default function RemediationPlan({
  gaps,
  projections,
  peerReadiness,
  rankingSummary,
}: {
  gaps: Gap[];
  projections: Projection[];
  peerReadiness: number;
  rankingSummary: string;
}) {
  const [n, setN] = useState(Math.min(5, gaps.length));
  const projection = projections[n - 1];

  const inPlan = gaps.slice(0, n);
  const effortMix = inPlan.reduce<Record<string, number>>((acc, gap) => {
    acc[gap.effort] = (acc[gap.effort] ?? 0) + 1;
    return acc;
  }, {});
  const criteriaTouched = new Set(inPlan.flatMap((g) => g.criteria));
  const highRisk = inPlan.filter((g) => g.inherentRisk === "high").length;
  const clearsPeer =
    projection.to >= peerReadiness && projection.from < peerReadiness;

  return (
    <>
      <Card
        title="Readiness projection"
        subtitle="What closing the top-ranked gaps returns, re-scored through the same engine that produced today's number"
        className="mb-5"
      >
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div>
            <label
              htmlFor="topn"
              className="block text-xs font-medium text-ink-muted"
            >
              Fix the top{" "}
              <span className="num font-semibold text-ink">{n}</span> gap
              {n === 1 ? "" : "s"}
            </label>
            <input
              id="topn"
              type="range"
              min={1}
              max={gaps.length}
              value={n}
              onChange={(e) => setN(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--color-accent)]"
            />
            <div className="num flex justify-between text-[11px] text-ink-muted">
              <span>1</span>
              <span>{gaps.length} (every gap)</span>
            </div>

            <dl className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-ink-muted">High inherent risk in plan</dt>
                <dd className="num font-semibold">{highRisk}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Criteria touched</dt>
                <dd className="num font-semibold">{criteriaTouched.size}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Effort mix</dt>
                <dd className="num font-semibold">
                  {["low", "medium", "high"]
                    .filter((e) => effortMix[e])
                    .map((e) => `${effortMix[e]} ${e}`)
                    .join(" · ")}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-[11px] text-ink-muted">Today</p>
                <p className="num text-3xl font-semibold">
                  {projection.from.toFixed(0)}%
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-ink-muted" aria-hidden />
              <div>
                <p className="text-[11px] text-ink-muted">
                  After the top {n}
                </p>
                <p className="num text-3xl font-semibold text-accent">
                  {projection.to.toFixed(0)}%
                </p>
              </div>
              <p className="num rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
                +{projection.lift.toFixed(1)} points
              </p>
            </div>

            <div className="mt-4">
              <div className="relative h-6 w-full overflow-hidden rounded-lg bg-canvas">
                <div
                  className="absolute inset-y-0 left-0 bg-[#bcd7e2]"
                  style={{ width: `${projection.to}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-accent"
                  style={{ width: `${projection.from}%` }}
                />
                <div
                  className="absolute inset-y-0 w-0.5 bg-ink"
                  style={{ left: `${peerReadiness}%` }}
                  aria-hidden
                />
              </div>
              <div className="num mt-1 flex justify-between text-[11px] text-ink-muted">
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-accent align-middle" />
                  current readiness
                </span>
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#bcd7e2] align-middle" />
                  projected
                </span>
                <span>| peer median {peerReadiness}%</span>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-ink-muted">
              Closing the top {n} gap{n === 1 ? "" : "s"} would move estimated
              readiness from{" "}
              <span className="num font-semibold text-ink">
                {projection.from.toFixed(0)}%
              </span>{" "}
              to{" "}
              <span className="num font-semibold text-ink">
                {projection.to.toFixed(0)}%
              </span>
              {clearsPeer
                ? `, clearing the ${peerReadiness}% peer median.`
                : projection.to < peerReadiness
                  ? `, still short of the ${peerReadiness}% peer median.`
                  : "."}{" "}
              It assumes each control ends up implemented and evidenced
              across the period — which is the whole point: a fix you
              can&apos;t evidence won&apos;t move a Type II score.
            </p>
          </div>
        </div>

        <MethodNote>
          <span className="font-semibold text-ink">How gaps are ranked: </span>
          {rankingSummary}
        </MethodNote>
      </Card>

      <div className="space-y-3">
        {gaps.map((gap, i) => (
          <GapCard
            key={gap.controlId}
            gap={gap}
            rank={i + 1}
            inPlan={i < n}
          />
        ))}
      </div>
    </>
  );
}
