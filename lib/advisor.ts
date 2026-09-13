/**
 * Context assembly for the Ask-the-Advisor box.
 *
 * The model is given a compact, pre-summarized snapshot rather than the raw
 * JSON. Three reasons: the raw dataset is far larger than it needs to be, the
 * numbers here are already computed by the same engines the UI uses (so the
 * answer cannot contradict the dashboard), and a tight context keeps the call
 * cheap.
 */

import {
  getBenchmark,
  getCompany,
  getControls,
  getCriteria,
  getRoles,
  getSodRules,
  getUsers,
  categoryName,
} from "./data";
import { computeReadiness } from "./scoring";
import { rankGaps } from "./remediation";
import { detectViolations, summarizeViolations } from "./sod";

export const SYSTEM_PROMPT = `You are a SOC 2 readiness advisor for a synthetic company. Answer ONLY from the provided data. Be concise, specific, and quantified. Reference the relevant Common Criteria (CCx) when useful. If the data doesn't support an answer, say so. You do not issue audit opinions.

Additional guidance:
- Prefer three or four short paragraphs or a short list over a long essay. Never exceed 250 words.
- Always cite the control ID (CTRL-0xx) or the criterion (e.g. CC6.3) behind a claim.
- The company data is synthetic and this is a readiness estimate, not an examination. Do not describe anything as passing, failing, or as an opinion.
- Counts in this data have different denominators: findings, people, controls, and criteria are counted separately. Never merge two of them into one phrase — when you cite a number, say exactly what it counts. For example, 14 access conflicts, 9 of them high severity, held by 12 employees are three distinct figures.
- Do not compute or estimate new figures. Every number you give must appear in the data above exactly as written — if a total, ratio, or "unique count" is not there, do not derive one.
- If asked something the data cannot answer, say what is missing rather than guessing.`;

export type AdvisorSnapshot = {
  context: string;
  readiness: number;
  topGapIds: string[];
};

export function buildAdvisorContext(): AdvisorSnapshot {
  const company = getCompany();
  const controls = getControls();
  const criteria = getCriteria();
  const users = getUsers();
  const benchmark = getBenchmark();

  const readiness = computeReadiness(controls, criteria);
  const violations = detectViolations(users, getRoles(), getSodRules());
  const sod = summarizeViolations(violations, users);
  const gaps = rankGaps(controls, criteria, {
    sodViolationCount: sod.totalViolations,
    sodHighSeverityCount: sod.bySeverity.high,
  });

  const weakestCriteria = [...readiness.byCriterion]
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, 8);

  const lines: string[] = [];

  lines.push(
    `COMPANY: ${company.name}, ${company.industry}, ${company.employees} employees, ${company.headquarters}.`,
    `EXAMINATION: ${company.reportType} over ${company.auditPeriod.start} to ${company.auditPeriod.end} (${company.auditPeriod.months} months), assessed as of ${company.asOfDate}. ${company.priorReport}`,
    `IN SCOPE: ${company.inScopeTsc.map((t) => t.label).join("; ")}.`,
    `OUT OF SCOPE: ${company.outOfScopeTsc.map((t) => `${t.label} (${t.rationale})`).join("; ")}`,
    "",
    `READINESS: ${readiness.overall.toFixed(1)}% overall. Peer median ${benchmark.medianReadiness}% for ${benchmark.peerGroup}.`,
    `CONTROLS: ${readiness.counts.controls} total — ${readiness.counts.implemented} implemented, ${readiness.counts.partial} partial, ${readiness.counts.notImplemented} not implemented. Evidence: ${readiness.counts.evidenceCurrent} current, ${readiness.counts.evidenceStale} stale, ${readiness.counts.evidenceMissing} missing. Open high-risk controls: ${readiness.counts.openHighRisk}.`,
    `SCORING: control effectiveness = maturity (implemented 1.0 / partial 0.5 / none 0) x evidence factor (current 1.0 / stale 0.6 / missing 0.3). Criterion coverage = risk-weighted mean of its controls (high 3, medium 2, low 1). Overall = unweighted mean of criterion coverage.`,
    "",
    "CATEGORY COVERAGE:",
    ...readiness.byCategory.map(
      (c) =>
        `  ${c.id} ${categoryName(c.id)}: ${c.coverage.toFixed(0)}% (${c.controlIds.length} controls)`,
    ),
    "",
    "WEAKEST CRITERIA:",
    ...weakestCriteria.map(
      (c) =>
        `  ${c.id}: ${c.coverage.toFixed(0)}% — ${c.intent} [controls: ${c.controlIds.join(", ") || "none"}]`,
    ),
    "",
    `TOP RANKED GAPS (priority = readiness points x risk / effort):`,
    ...gaps
      .slice(0, 12)
      .map(
        (g, i) =>
          `  ${i + 1}. ${g.controlId} [${g.criteria.join(",")}] ${g.controlTitle} — status ${g.status}, evidence ${g.evidence}, ${g.inherentRisk} risk, ${g.effort} effort, +${g.readinessLift.toFixed(1)} readiness points, priority ${g.priorityScore.toFixed(0)}/100, owner ${g.owner}. Action: ${g.recommendedAction}`,
      ),
    "",
    `SEGREGATION OF DUTIES: ${sod.totalViolations} violations (${sod.bySeverity.high} high, ${sod.bySeverity.medium} medium) across ${sod.usersWithConflicts} of ${sod.usersReviewed} employees. Criteria affected: ${sod.mappedCriteria.join(", ")}.`,
    "SOD FINDINGS:",
    ...violations.map(
      (v) =>
        `  ${v.userId} ${v.name} (${v.title}, ${v.department}): ${v.permissionA} via ${v.viaRolesA.join("/")} + ${v.permissionB} via ${v.viaRolesB.join("/")} — ${v.severity} severity, rule ${v.ruleId} ${v.ruleTitle}, criteria ${v.mappedCriteria.join(",")}. Risk: ${v.rationale}`,
    ),
    "",
    `BENCHMARK: peer median readiness ${benchmark.medianReadiness}%, top quartile ${benchmark.topQuartileReadiness}%, median open high-risk gaps ${benchmark.medianOpenHighRiskGaps}, median SoD violations ${benchmark.medianSodViolations}, median controls implemented ${benchmark.medianControlsImplementedPct}%, median weeks to audit-ready ${benchmark.medianWeeksToAuditReady}.`,
  );

  return {
    context: lines.join("\n"),
    readiness: readiness.overall,
    topGapIds: gaps.slice(0, 5).map((g) => g.controlId),
  };
}

export const SUGGESTED_QUESTIONS = [
  "What's blocking my Type II readiness the most right now?",
  "Which segregation-of-duties conflict is most urgent, and why?",
  "If I only have six weeks, what should my team fix first?",
  "Where is change management weakest, and what would an auditor test?",
];

/**
 * Deterministic answer used when no API key is configured, so the tab still
 * shows real, grounded numbers instead of an error. It summarizes rather than
 * reasons, and says so.
 */
export function offlineAnswer(): string {
  const controls = getControls();
  const criteria = getCriteria();
  const users = getUsers();
  const readiness = computeReadiness(controls, criteria);
  const violations = detectViolations(users, getRoles(), getSodRules());
  const sod = summarizeViolations(violations, users);
  const gaps = rankGaps(controls, criteria, {
    sodViolationCount: sod.totalViolations,
    sodHighSeverityCount: sod.bySeverity.high,
  });
  const weakest = [...readiness.byCategory].sort(
    (a, b) => a.coverage - b.coverage,
  )[0];
  const topSod = violations[0];

  return [
    `Estimated readiness is ${readiness.overall.toFixed(0)}%. ${readiness.counts.openHighRisk} high-risk controls are open, and ${readiness.counts.evidenceStale + readiness.counts.evidenceMissing} controls have evidence that would not support a Type II conclusion (${readiness.counts.evidenceStale} stale, ${readiness.counts.evidenceMissing} missing).`,
    ``,
    `Weakest category: ${weakest.id} at ${weakest.coverage.toFixed(0)}%. The three highest-priority gaps are ${gaps
      .slice(0, 3)
      .map((g) => `${g.controlId} (${g.controlTitle}, +${g.readinessLift.toFixed(1)} points)`)
      .join("; ")}.`,
    ``,
    topSod
      ? `The segregation of duties analyzer finds ${sod.totalViolations} conflicts, ${sod.bySeverity.high} at high severity. The first by severity is ${topSod.name} (${topSod.title}), holding ${topSod.permissionA} and ${topSod.permissionB} — ${topSod.ruleTitle}.`
      : `No segregation of duties conflicts were found.`,
  ].join("\n");
}
