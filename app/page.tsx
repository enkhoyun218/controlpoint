import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  CircleSlash,
  FileClock,
  Network,
  ShieldCheck,
} from "lucide-react";

import CategoryCoverageChart from "@/components/CategoryCoverageChart";
import KpiCard from "@/components/KpiCard";
import ReadinessGauge from "@/components/ReadinessGauge";
import { Card, MethodNote, PageHeader, Pill } from "@/components/ui";
import {
  categoryName,
  formatDate,
  getBenchmark,
  getCompany,
  getControls,
  getCriteria,
  getCriteriaCategories,
  getRoles,
  getSodRules,
  getUsers,
} from "@/lib/data";
import { detectViolations, summarizeViolations } from "@/lib/sod";
import { computeReadiness, FORMULA_SUMMARY } from "@/lib/scoring";

export default function DashboardPage() {
  const company = getCompany();
  const controls = getControls();
  const criteria = getCriteria();
  const categories = getCriteriaCategories();
  const benchmark = getBenchmark();

  const readiness = computeReadiness(controls, criteria);
  const violations = detectViolations(getUsers(), getRoles(), getSodRules());
  const sod = summarizeViolations(violations, getUsers());

  const evidenceGaps =
    readiness.counts.evidenceStale + readiness.counts.evidenceMissing;

  const chartData = readiness.byCategory.map((c) => ({
    id: c.id,
    name: categoryName(c.id),
    coverage: c.coverage,
    controls: c.controlIds.length,
  }));

  const weakest = [...readiness.byCategory].sort(
    (a, b) => a.coverage - b.coverage,
  )[0];

  const vsPeer = readiness.overall - benchmark.medianReadiness;

  return (
    <>
      <PageHeader
        eyebrow="Readiness overview"
        title={`${company.name} — SOC 2 Type II readiness`}
        intro={
          <>
            {company.description} This page estimates how much of the
            examination {company.name} could support today, scored from{" "}
            {controls.length} modeled controls across {criteria.length} criteria.
            It is a readiness estimate, not an audit opinion.
          </>
        }
      />

      {/* Type II period framing — the whole score hangs off this window. */}
      <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-line bg-surface px-5 py-4">
        <div className="flex items-start gap-2.5">
          <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
          <div>
            <p className="text-xs font-semibold">
              Type II examination period
            </p>
            <p className="num text-xs text-ink-muted">
              {formatDate(company.auditPeriod.start)} –{" "}
              {formatDate(company.auditPeriod.end)} ({company.auditPeriod.months}{" "}
              months) · assessed as of {formatDate(company.asOfDate)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-muted">In scope</span>
          {company.inScopeTsc.map((t) => (
            <Pill key={t.code} tone="info" icon={<ShieldCheck className="h-3 w-3" />}>
              {t.label.split(" (")[0]}
              {t.required ? " · required" : ""}
            </Pill>
          ))}
          {company.outOfScopeTsc.map((t) => (
            <Pill key={t.code} tone="neutral" icon={<CircleSlash className="h-3 w-3" />}>
              {t.label} · not in scope
            </Pill>
          ))}
        </div>
        <p className="w-full text-[11px] leading-5 text-ink-muted">
          {company.typeIiNote}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Estimated readiness"
          subtitle="Share of in-scope criteria the evidence would currently support"
          className="lg:row-span-2"
        >
          <ReadinessGauge
            value={readiness.overall}
            benchmark={benchmark.medianReadiness}
          />
          <p className="num mt-4 text-center text-xs text-ink-muted">
            {vsPeer >= 0 ? "+" : "−"}
            {Math.abs(vsPeer).toFixed(0)} points{" "}
            {vsPeer >= 0 ? "above" : "below"} the peer median of{" "}
            {benchmark.medianReadiness}%
          </p>
          <MethodNote>
            <span className="font-semibold text-ink">
              How this is calculated:{" "}
            </span>
            {FORMULA_SUMMARY}
          </MethodNote>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <KpiCard
            label="Controls fully implemented"
            value={readiness.implementedPct.toFixed(0)}
            unit="%"
            tone={readiness.implementedPct >= 80 ? "good" : "warn"}
            icon={<ShieldCheck className="h-4 w-4" />}
            note={`${readiness.counts.implemented} of ${readiness.counts.controls} controls · ${readiness.counts.partial} partial, ${readiness.counts.notImplemented} not implemented`}
            href="/controls"
            linkLabel="Open the control register"
          />
          <KpiCard
            label="Open high-risk gaps"
            value={readiness.counts.openHighRisk}
            tone={
              readiness.counts.openHighRisk > benchmark.medianOpenHighRiskGaps
                ? "bad"
                : "warn"
            }
            icon={<AlertTriangle className="h-4 w-4" />}
            note={`High inherent risk and not both implemented and currently evidenced · peer median ${benchmark.medianOpenHighRiskGaps}`}
            href="/remediation"
            linkLabel="See the remediation plan"
          />
          <KpiCard
            label="Controls without usable evidence"
            value={evidenceGaps}
            tone="bad"
            icon={<FileClock className="h-4 w-4" />}
            note={`${readiness.counts.evidenceStale} stale, ${readiness.counts.evidenceMissing} missing — the classic Type II failure: the control exists but cannot be shown to have operated all period`}
            href="/controls"
            linkLabel="Filter the register by evidence"
          />
          <KpiCard
            label="Segregation of duties violations"
            value={sod.totalViolations}
            tone="bad"
            icon={<Network className="h-4 w-4" />}
            note={`${sod.bySeverity.high} high, ${sod.bySeverity.medium} medium · ${sod.usersWithConflicts} of ${sod.usersReviewed} users hold a conflicting pair`}
            href="/sod"
            linkLabel="Open the SoD analyzer"
          />
        </div>

        <Card
          title="Coverage by criteria category"
          subtitle="Risk-weighted coverage of the controls mapped to each category"
          className="lg:col-span-2"
          right={
            <Link
              href="/criteria"
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
            >
              Explore criteria
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          }
        >
          <CategoryCoverageChart
            data={chartData}
            benchmark={benchmark.medianReadiness}
          />
          <MethodNote>
            CC1–CC9 are the Common Criteria that make up the mandatory Security
            category. PI1 and C1 are in scope because {company.name} makes
            processing and confidentiality commitments to merchants. Weakest
            category: <span className="font-semibold text-ink">{weakest.id} — {categoryName(weakest.id)}</span> at{" "}
            {weakest.coverage.toFixed(0)}%.
          </MethodNote>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          title="Companies like you"
          subtitle={benchmark.peerGroup}
          className="lg:col-span-1"
        >
          <dl className="space-y-3">
            <BenchRow
              label="Readiness"
              you={`${readiness.overall.toFixed(0)}%`}
              peer={`${benchmark.medianReadiness}%`}
              worse={readiness.overall < benchmark.medianReadiness}
            />
            <BenchRow
              label="Controls implemented"
              you={`${readiness.implementedPct.toFixed(0)}%`}
              peer={`${benchmark.medianControlsImplementedPct}%`}
              worse={
                readiness.implementedPct < benchmark.medianControlsImplementedPct
              }
            />
            <BenchRow
              label="Open high-risk gaps"
              you={String(readiness.counts.openHighRisk)}
              peer={String(benchmark.medianOpenHighRiskGaps)}
              worse={
                readiness.counts.openHighRisk > benchmark.medianOpenHighRiskGaps
              }
            />
            <BenchRow
              label="SoD violations"
              you={String(sod.totalViolations)}
              peer={String(benchmark.medianSodViolations)}
              worse={sod.totalViolations > benchmark.medianSodViolations}
            />
          </dl>
          <MethodNote>
            Peer figures are modeled reference points for a{" "}
            {benchmark.sampleSize}-company illustrative set, not a survey of real
            companies.
          </MethodNote>
        </Card>

        <Card
          title="Biggest drags on the score"
          subtitle="Points of overall readiness each control would return if it were implemented with current evidence"
          className="lg:col-span-2"
          right={
            <Link
              href="/remediation"
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
            >
              Full plan
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          }
        >
          <ul className="divide-y divide-line">
            {readiness.drags.slice(0, 6).map((drag) => (
              <li
                key={drag.controlId}
                className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="num mt-0.5 w-14 shrink-0 text-right text-sm font-semibold text-accent">
                  +{drag.liftIfRemediated.toFixed(1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">
                    {drag.title}
                  </span>
                  <span className="num mt-0.5 block text-[11px] text-ink-muted">
                    {drag.controlId} · {drag.criteria.join(", ")} ·{" "}
                    {drag.inherentRisk} inherent risk
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="mt-6 text-[11px] leading-5 text-ink-muted">
        All figures on this page are computed from synthetic data describing a
        fictional company. Nothing here constitutes a SOC 2 examination, an
        auditor&apos;s opinion, or advice about a real environment.
      </p>
    </>
  );
}

function BenchRow({
  label,
  you,
  peer,
  worse,
}: {
  label: string;
  you: string;
  peer: string;
  worse: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="num flex items-center gap-2">
        <span className={`font-semibold ${worse ? "text-rose-700" : "text-emerald-700"}`}>
          {you}
        </span>
        <span className="text-[11px] text-ink-muted">vs {peer} peer</span>
      </dd>
    </div>
  );
}
