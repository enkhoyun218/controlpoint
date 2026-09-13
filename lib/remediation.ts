/**
 * Gap ranking and the readiness-lift projection.
 *
 * A gap is any control that would not survive Type II testing today: not fully
 * implemented, or implemented without evidence good enough to show it operated
 * across the period.
 *
 * Ranking answers "what should we do first", which is not the same as "what is
 * worst". Three things decide it:
 *
 *   readiness lift  — the points of overall readiness the fix actually returns,
 *                     taken from the scoring engine rather than guessed
 *   inherent risk   — high-risk controls are worth more than low-risk ones
 *   effort          — dividing by effort promotes the cheap fixes that move the
 *                     score, which is how a real remediation plan is sequenced
 *
 *   priority = (readiness lift x risk weight) / effort cost
 *
 * Scores are then rescaled so the top item is 100, because the ordering is what
 * matters and an unscaled raw number invites false precision.
 *
 * Pure: no dates, no I/O.
 */

import type { Control, Criterion, RiskLevel } from "./data";
import { overallReadiness, projectReadiness, RISK_WEIGHT } from "./scoring";

export type Effort = "low" | "medium" | "high";

export const EFFORT_COST: Record<Effort, number> = {
  low: 1,
  medium: 2,
  high: 3.5,
};

export const EFFORT_ESTIMATE: Record<Effort, string> = {
  low: "About 1–2 weeks",
  medium: "About 3–6 weeks",
  high: "A quarter or more",
};

/**
 * Product names that survive a lowercase pass even though they look like
 * ordinary capitalized words. Kept deliberately tiny — if this grows past a
 * handful, the evidence names should carry their own casing instead.
 */
const PROPER_NOUNS = new Set(["Terraform"]);

/**
 * Control titles and evidence names are written in sentence case but get
 * dropped into the middle of a sentence. Lowercasing the whole string destroys
 * the acronyms these artefacts are actually named by — SOC 2, LMS, BC/DR, MDM,
 * JIT, SIEM, IdP, IaC, SLA — which reads as carelessness to the one audience
 * that would notice. So only the first word is lowered, and only when it is an
 * ordinary capitalized word rather than an acronym or a product name.
 */
export function midSentence(text: string): string {
  const first = text.split(" ")[0] ?? "";
  const ordinary = /^[A-Z][a-z-]*$/.test(first) && !PROPER_NOUNS.has(first);
  return ordinary ? text[0].toLowerCase() + text.slice(1) : text;
}

/** How to say "it ran on schedule" for each control frequency. */
const CADENCE_ADVERB: Record<string, string> = {
  continuous: "continuously",
  daily: "every day",
  weekly: "every week",
  monthly: "every month",
  quarterly: "every quarter",
  "semi-annual": "every six months",
  annual: "every year",
  "per-event": "every time it was triggered",
};

export const RANKING_SUMMARY =
  "Priority = (readiness points returned × inherent-risk weight) ÷ effort, rescaled so the top item is 100. Dividing by effort is deliberate — it pushes cheap fixes that move the score to the top, which is how a real remediation plan gets sequenced.";

export type Gap = {
  controlId: string;
  title: string;
  controlTitle: string;
  description: string;
  criteria: string[];
  primaryCriterion: string;
  criterionIntent: string;
  owner: string;
  frequency: string;
  status: Control["status"];
  evidence: Control["evidence"];
  inherentRisk: RiskLevel;
  whyItMatters: string;
  recommendedAction: string;
  effort: Effort;
  effortEstimate: string;
  readinessLift: number;
  priorityScore: number;
  supportingFinding?: string;
};

export function isGap(control: Control): boolean {
  return control.status !== "implemented" || control.evidence !== "current";
}

/**
 * Effort is inferred from the shape of the gap rather than invented:
 * re-evidencing a control that already runs is cheap, building one that does
 * not exist is not, and continuous technical controls cost more than annual
 * process ones.
 */
export function estimateEffort(control: Control): Effort {
  let score: number;
  if (control.status === "not_implemented") score = 4;
  else if (control.status === "partial")
    score = control.evidence === "missing" ? 3 : 2.25;
  else score = control.evidence === "stale" ? 1 : 2;

  if (control.frequency === "continuous" || control.frequency === "daily")
    score += 1;
  else if (control.frequency === "monthly" || control.frequency === "quarterly")
    score += 0.5;

  if (score <= 1.5) return "low";
  if (score <= 3) return "medium";
  return "high";
}

function findingTitle(control: Control): string {
  const title = midSentence(control.title);
  if (control.status === "not_implemented")
    return `Control not in place — ${title}`;
  if (control.status === "partial") return `Partially implemented — ${title}`;
  if (control.evidence === "missing") return `No evidence retained — ${title}`;
  return `Evidence will not support the period — ${title}`;
}

function whyItMatters(
  control: Control,
  intent: string,
  /** Other controls mapped to any of the same criteria — 0 means the criterion really does rest on this one alone. */
  siblings: number,
): string {
  const risk = `Inherent risk is ${control.inherentRisk}`;
  const criteria = control.criteria.join(", ");
  const one = control.criteria.length === 1;

  if (control.status === "not_implemented") {
    // Only claim a criterion is unaddressed when no other control covers it.
    // Saying "nothing addresses CC6.3" while three other controls map to it is
    // the kind of overstatement that costs a report its credibility.
    if (siblings === 0) {
      return `Nothing addresses ${criteria} today${intent ? ` — ${midSentence(intent).replace(/\.$/, "")}` : ""}. ${risk}, and a criterion with no working control behind it can't be covered by testing something else. Expect this to land as a deficiency, not an exception.`;
    }
    return `This control is not in place, so ${criteria} ${one ? "rests" : "rest"} on the ${siblings} other control${siblings === 1 ? "" : "s"} mapped to ${one ? "it" : "them"}. ${risk}. Whether what remains is enough to meet the objective is the auditor's judgement rather than management's — this is where a design deficiency gets written.`;
  }
  if (control.status === "partial") {
    return `The control exists but doesn't cover everything ${criteria} ${one ? "expects" : "expect"}${intent ? ` — that ${midSentence(intent).replace(/\.$/, "")}` : ""}. ${risk}. Partial coverage means the auditor tests the full population and finds the part that was never in scope. That's an exception, not a pass.`;
  }
  if (control.evidence === "missing") {
    return `The control seems to run, but nothing is kept to show it. ${risk}, and for ${criteria} an untestable control is treated as one that didn't operate — a Type II opinion rests on evidence across the period, not management's word.`;
  }
  return `The control runs, but the evidence on hand — ${midSentence(control.evidenceType)} — predates the examination period. ${risk}. This is the most common Type II failure: the control is fine, the proof that it ran ${CADENCE_ADVERB[control.frequency] ?? "on schedule"} isn't.`;
}

function recommendedAction(control: Control): string {
  const one = control.criteria.length === 1;
  const cadence =
    control.frequency === "per-event"
      ? "each time it is triggered"
      : `on its ${control.frequency} cadence`;

  if (control.status === "not_implemented") {
    return `Design and stand up the control, assign it to ${control.owner} on a documented ${control.frequency} cadence, and keep the ${midSentence(control.evidenceType)} from the first run onward. With no history, plan for a shortened observation window — or accept that ${one ? "this criterion" : "these criteria"} won't be covered in the first Type II.`;
  }
  if (control.status === "partial") {
    return `Extend the control to the full population it should cover, have ${control.owner} confirm the scope in writing, and produce the ${midSentence(control.evidenceType)} ${cadence} for every item in scope — not just the part already covered.`;
  }
  if (control.evidence === "missing") {
    return `Start keeping the ${midSentence(control.evidenceType)} ${cadence}, with ${control.owner} as the named reviewer, and back-fill whatever you can reconstruct for the period. If the control is system-driven, automate the capture so evidence piles up without anyone remembering to save it.`;
  }
  return `From here on, re-perform the control and have ${control.owner} keep the ${midSentence(control.evidenceType)} ${cadence}. This is an evidence problem, not a design one — so the fix is retention discipline, not a new control.`;
}

/** Criterion whose coverage this control most influences — used as the headline criterion on the gap card. */
function primaryCriterion(control: Control): string {
  return control.criteria[0];
}

export type RankOptions = {
  /**
   * Access conflicts found by the SoD analyzer. Gaps in access controls that
   * should have caught them get the count attached, because "this control is
   * weak" lands differently than "this control is weak and here are the twelve
   * people it failed to stop".
   */
  sodViolationCount?: number;
  sodHighSeverityCount?: number;
};

/** Access controls carrying least-privilege duties — where SoD findings belong. */
const SOD_LINKED_CRITERION = "CC6.3";

export function rankGaps(
  controls: Control[],
  criteria: Criterion[],
  options: RankOptions = {},
): Gap[] {
  const base = overallReadiness(controls, criteria);
  const intents = new Map(criteria.map((c) => [c.id, c.intent]));

  const raw = controls.filter(isGap).map((control) => {
    const effort = estimateEffort(control);
    const siblings = controls.filter(
      (other) =>
        other.id !== control.id &&
        other.criteria.some((c) => control.criteria.includes(c)),
    ).length;
    const lift = projectReadiness(controls, criteria, [control.id]) - base;
    const rawPriority =
      (lift * RISK_WEIGHT[control.inherentRisk]) / EFFORT_COST[effort];
    const intent = intents.get(primaryCriterion(control)) ?? "";

    const supporting =
      options.sodViolationCount && control.criteria.includes(SOD_LINKED_CRITERION)
        ? `The SoD analyzer currently finds ${options.sodViolationCount} access conflicts (${options.sodHighSeverityCount ?? 0} high severity) in the user listing. This is the control that should be catching them — so those conflicts are the proof it isn't working.`
        : undefined;

    return {
      gap: {
        controlId: control.id,
        title: findingTitle(control),
        controlTitle: control.title,
        description: control.description,
        criteria: control.criteria,
        primaryCriterion: primaryCriterion(control),
        criterionIntent: intent,
        owner: control.owner,
        frequency: control.frequency,
        status: control.status,
        evidence: control.evidence,
        inherentRisk: control.inherentRisk,
        whyItMatters: whyItMatters(control, intent, siblings),
        recommendedAction: recommendedAction(control),
        effort,
        effortEstimate: EFFORT_ESTIMATE[effort],
        readinessLift: lift,
        priorityScore: 0,
        supportingFinding: supporting,
      } satisfies Gap,
      rawPriority,
    };
  });

  const max = Math.max(...raw.map((r) => r.rawPriority), 0.0001);

  return raw
    .map(({ gap, rawPriority }) => ({
      ...gap,
      priorityScore: (rawPriority / max) * 100,
    }))
    .sort(
      (a, b) =>
        b.priorityScore - a.priorityScore ||
        b.readinessLift - a.readinessLift ||
        a.controlId.localeCompare(b.controlId),
    );
}

export type Projection = {
  n: number;
  from: number;
  to: number;
  lift: number;
  controlIds: string[];
};

/**
 * Readiness if the top N ranked gaps were closed. Computed by re-scoring the
 * control set with those controls implemented and currently evidenced — the
 * same engine, not a separate estimate, so the projection cannot drift from
 * the score it projects.
 */
export function projectTopN(
  controls: Control[],
  criteria: Criterion[],
  gaps: Gap[],
): Projection[] {
  const from = overallReadiness(controls, criteria);
  const out: Projection[] = [];
  for (let n = 1; n <= gaps.length; n += 1) {
    const controlIds = gaps.slice(0, n).map((g) => g.controlId);
    const to = projectReadiness(controls, criteria, controlIds);
    out.push({ n, from, to, lift: to - from, controlIds });
  }
  return out;
}
