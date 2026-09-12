import AdvisorBox from "@/components/AdvisorBox";
import { Card, PageHeader } from "@/components/ui";
import { SUGGESTED_QUESTIONS } from "@/lib/advisor";
import {
  getControls,
  getCriteria,
  getRoles,
  getSodRules,
  getUsers,
} from "@/lib/data";
import { rankGaps } from "@/lib/remediation";
import { computeReadiness } from "@/lib/scoring";
import { detectViolations, summarizeViolations } from "@/lib/sod";

export const metadata = {
  title: "Ask the Advisor — ControlPoint",
};

export default function AdvisorPage() {
  const controls = getControls();
  const criteria = getCriteria();
  const users = getUsers();
  const readiness = computeReadiness(controls, criteria);
  const violations = detectViolations(users, getRoles(), getSodRules());
  const sod = summarizeViolations(violations, users);
  const gaps = rankGaps(controls, criteria);

  return (
    <>
      <PageHeader
        eyebrow="Ask the Advisor"
        title="Question the data"
        intro={
          <>
            A Claude Haiku call grounded in this company&apos;s own numbers. It
            is given a compact snapshot — readiness, per-criterion coverage,
            every ranked gap, and every access conflict — and instructed to
            answer only from that, cite the control or criterion behind each
            claim, and say so when the data cannot answer the question.
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <AdvisorBox suggestions={SUGGESTED_QUESTIONS} />

        <div className="space-y-4">
          <Card title="What the advisor can see" bodyClassName="p-5">
            <dl className="space-y-2.5 text-xs">
              <Row label="Readiness" value={`${readiness.overall.toFixed(0)}%`} />
              <Row label="Controls" value={String(controls.length)} />
              <Row label="Criteria" value={String(criteria.length)} />
              <Row label="Ranked gaps" value={String(gaps.length)} />
              <Row
                label="SoD findings"
                value={`${sod.totalViolations} (${sod.bySeverity.high} high)`}
              />
              <Row label="Employees reviewed" value={String(users.length)} />
            </dl>
            <p className="mt-4 border-t border-line pt-3 text-[11px] leading-5 text-ink-muted">
              The snapshot is built from the same scoring, ranking, and SoD
              engines that render the other tabs, so an answer here cannot
              contradict a number shown elsewhere in the app.
            </p>
          </Card>

          <Card title="Guardrails" bodyClassName="p-5">
            <ul className="space-y-2 text-[11px] leading-5 text-ink-muted">
              <li>
                <span className="font-semibold text-ink">
                  Answers only from the snapshot.
                </span>{" "}
                The model is told to say what is missing rather than guess.
              </li>
              <li>
                <span className="font-semibold text-ink">
                  No audit opinions.
                </span>{" "}
                It estimates readiness; it does not pass, fail, or attest.
              </li>
              <li>
                <span className="font-semibold text-ink">
                  Degrades gracefully.
                </span>{" "}
                Without an API key the tab returns a locally computed summary
                instead of an error, and labels it as such.
              </li>
              <li>
                <span className="font-semibold text-ink">Synthetic data.</span>{" "}
                Every figure describes a company that does not exist.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="num font-semibold">{value}</dd>
    </div>
  );
}
