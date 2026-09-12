import RemediationPlan from "@/components/RemediationPlan";
import { PageHeader } from "@/components/ui";
import {
  getBenchmark,
  getControls,
  getCriteria,
  getRoles,
  getSodRules,
  getUsers,
} from "@/lib/data";
import {
  projectTopN,
  rankGaps,
  RANKING_SUMMARY,
} from "@/lib/remediation";
import { detectViolations, summarizeViolations } from "@/lib/sod";

export const metadata = {
  title: "Remediation plan — ControlPoint",
};

export default function RemediationPage() {
  const controls = getControls();
  const criteria = getCriteria();
  const users = getUsers();

  const violations = detectViolations(users, getRoles(), getSodRules());
  const sod = summarizeViolations(violations, users);

  const gaps = rankGaps(controls, criteria, {
    sodViolationCount: sod.totalViolations,
    sodHighSeverityCount: sod.bySeverity.high,
  });
  const projections = projectTopN(controls, criteria, gaps);

  return (
    <>
      <PageHeader
        eyebrow="Remediation"
        title="What to fix first"
        intro={
          <>
            Every control that would not survive Type II testing today, ranked by
            the readiness points the fix returns, weighted by inherent risk, and
            divided by effort. {gaps.length} gaps, each with the reason it
            matters and a concrete action — not a list of controls to &ldquo;review&rdquo;.
          </>
        }
      />

      <RemediationPlan
        gaps={gaps}
        projections={projections}
        peerReadiness={getBenchmark().medianReadiness}
        rankingSummary={RANKING_SUMMARY}
      />

      <p className="mt-6 text-[11px] leading-5 text-ink-muted">
        Effort estimates are modeled from the shape of each gap, not from a real
        engagement, and the projection is an arithmetic consequence of the
        scoring formula rather than a prediction about audit outcomes. Closing
        every gap here would not by itself produce a SOC 2 report.
      </p>
    </>
  );
}
