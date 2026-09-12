import { Gauge, TrendingUp, UserRound, Wrench } from "lucide-react";

import { EvidencePill, RiskPill, StatusPill } from "@/components/StatusPills";
import { Pill } from "@/components/ui";
import type { Effort, Gap } from "@/lib/remediation";

const EFFORT_TONE: Record<Effort, "good" | "warn" | "bad"> = {
  low: "good",
  medium: "warn",
  high: "bad",
};

export default function GapCard({
  gap,
  rank,
  inPlan,
}: {
  gap: Gap;
  rank: number;
  inPlan: boolean;
}) {
  return (
    <article
      className={`rounded-xl border bg-surface p-5 ${
        inPlan ? "border-accent shadow-[0_0_0_1px_var(--color-accent)]" : "border-line"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 gap-3">
          <span
            className={`num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
              inPlan ? "bg-accent text-white" : "bg-canvas text-ink-muted"
            }`}
            aria-label={`Rank ${rank}`}
          >
            {rank}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm leading-5 font-semibold first-letter:uppercase">
              {gap.title}
            </h3>
            <p className="num mt-0.5 text-[11px] text-ink-muted">
              {gap.controlId} · {gap.criteria.join(", ")} · owned by {gap.owner}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {inPlan ? <Pill tone="info">In this plan</Pill> : null}
          <RiskPill risk={gap.inherentRisk} />
          <Pill tone={EFFORT_TONE[gap.effort]} icon={<Wrench className="h-3 w-3" />}>
            {gap.effort} effort
          </Pill>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-canvas px-3 py-2">
          <dt className="flex items-center gap-1 text-[11px] text-ink-muted">
            <Gauge className="h-3 w-3" aria-hidden />
            Priority
          </dt>
          <dd className="num text-lg font-semibold">
            {gap.priorityScore.toFixed(0)}
            <span className="ml-1 text-[11px] font-normal text-ink-muted">
              / 100
            </span>
          </dd>
        </div>
        <div className="rounded-lg bg-canvas px-3 py-2">
          <dt className="flex items-center gap-1 text-[11px] text-ink-muted">
            <TrendingUp className="h-3 w-3" aria-hidden />
            Readiness returned
          </dt>
          <dd className="num text-lg font-semibold text-accent">
            +{gap.readinessLift.toFixed(1)}
            <span className="ml-1 text-[11px] font-normal text-ink-muted">
              points
            </span>
          </dd>
        </div>
        <div className="rounded-lg bg-canvas px-3 py-2">
          <dt className="flex items-center gap-1 text-[11px] text-ink-muted">
            <UserRound className="h-3 w-3" aria-hidden />
            Estimated effort
          </dt>
          <dd className="text-sm font-semibold">{gap.effortEstimate}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <StatusPill status={gap.status} />
        <EvidencePill evidence={gap.evidence} />
      </div>

      <p className="mt-3 text-xs leading-5 text-ink-muted">
        <span className="font-semibold text-ink">Why it matters: </span>
        {gap.whyItMatters}
      </p>

      <p className="mt-2 text-xs leading-5 text-ink-muted">
        <span className="font-semibold text-ink">Recommended action: </span>
        {gap.recommendedAction}
      </p>

      {gap.supportingFinding ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-900 ring-1 ring-rose-200 ring-inset">
          <span className="font-semibold">Supporting finding: </span>
          {gap.supportingFinding}
        </p>
      ) : null}
    </article>
  );
}
