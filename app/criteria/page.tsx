import { CircleSlash, ShieldCheck } from "lucide-react";

import CriteriaHeatmap, {
  type CategoryBlock,
} from "@/components/CriteriaHeatmap";
import { Card, MethodNote, PageHeader, Pill } from "@/components/ui";
import {
  categoryName,
  formatDate,
  getCompany,
  getControls,
  getCriteria,
  getCriteriaCategories,
  getOutOfScopeCategories,
} from "@/lib/data";
import { computeReadiness } from "@/lib/scoring";

export const metadata = {
  title: "Trust Services Criteria — ControlPoint",
};

export default function CriteriaPage() {
  const company = getCompany();
  const controls = getControls();
  const criteria = getCriteria();
  const categories = getCriteriaCategories();
  const readiness = computeReadiness(controls, criteria);

  const controlsById = new Map(controls.map((c) => [c.id, c]));

  const blocks: CategoryBlock[] = readiness.byCategory.map((cat) => {
    const meta = categories.find((c) => c.id === cat.id);
    return {
      id: cat.id,
      name: categoryName(cat.id),
      summary: meta?.summary ?? "",
      tsc: meta?.tsc ?? "Security",
      coverage: cat.coverage,
      criteria: cat.criteria.map((crit) => ({
        id: crit.id,
        intent: crit.intent,
        coverage: crit.coverage,
        controls: crit.controlIds.flatMap((id) => {
          const control = controlsById.get(id);
          if (!control) return [];
          return [
            {
              id: control.id,
              title: control.title,
              status: control.status,
              evidence: control.evidence,
              owner: control.owner,
              inherentRisk: control.inherentRisk,
              lastTested: formatDate(control.lastTested),
            },
          ];
        }),
      })),
    };
  });

  const weakest = [...readiness.byCriterion]
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="Trust Services Criteria"
        title="Criteria coverage and scoping"
        intro={
          <>
            SOC 2 has five Trust Services Categories. Security — the Common
            Criteria, CC1 through CC9 — is required in every examination; the
            other four are added when a company makes those commitments to its
            customers. Each cell below is one criterion, scored from the controls
            mapped to it. Click one to see those controls.
          </>
        }
      />

      <Card
        title="Scope of this examination"
        subtitle="Scope is a management decision, and auditors read it first"
        className="mb-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
              In scope
            </p>
            <ul className="space-y-2.5">
              {company.inScopeTsc.map((t) => (
                <li key={t.code} className="flex gap-2.5">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {t.label}
                      {t.required ? (
                        <Pill tone="info" className="ml-2">
                          Required
                        </Pill>
                      ) : (
                        <Pill tone="neutral" className="ml-2">
                          Elected
                        </Pill>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                      {t.rationale}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
              Not in scope
            </p>
            <ul className="space-y-2.5">
              {company.outOfScopeTsc.map((t) => (
                <li key={t.code} className="flex gap-2.5">
                  <CircleSlash
                    className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted"
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-medium text-ink-muted">
                      {t.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                      {t.rationale}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-2">
              {getOutOfScopeCategories().map((c) => (
                <p key={c.id} className="num text-[11px] text-ink-muted">
                  <span className="font-semibold">{c.id}</span> — {c.summary} Not
                  scored here.
                </p>
              ))}
            </div>
          </div>
        </div>
        <MethodNote>{company.scopingNote}</MethodNote>
      </Card>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {weakest.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-line bg-surface p-4"
          >
            <p className="num text-[11px] font-semibold text-ink-muted">
              Weakest criteria · {c.id}
            </p>
            <p className="num mt-1 text-2xl font-semibold text-rose-700">
              {c.coverage.toFixed(0)}%
            </p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">{c.intent}</p>
          </div>
        ))}
      </div>

      <CriteriaHeatmap categories={blocks} />

      <p className="mt-6 text-[11px] leading-5 text-ink-muted">
        Criteria intent is paraphrased in plain language. The AICPA&apos;s Trust
        Services Criteria text is copyrighted and is not reproduced here. Scores
        come from synthetic control data for a fictional company.
      </p>
    </>
  );
}
