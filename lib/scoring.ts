/**
 * Readiness scoring engine.
 *
 * Auditors distrust black boxes, so the formula is deliberately small enough to
 * check by hand:
 *
 *   1. Each control earns MATURITY points for how far it is implemented
 *        implemented 1.0 · partial 0.5 · not implemented 0.0
 *
 *   2. Those points are multiplied by an EVIDENCE multiplier
 *        current 1.0 · stale 0.6 · missing 0.3
 *      This is the Type II part. A Type I opinion asks whether a control is
 *      designed properly today; a Type II asks whether it actually operated
 *      across the whole period. A control nobody can evidence may well be
 *      running — but it cannot be relied on, so it cannot score full marks.
 *
 *        effectiveness = maturity x evidenceMultiplier        (0.0 – 1.0)
 *
 *   3. Controls are weighted by inherent risk when rolled up
 *        high 3 · medium 2 · low 1
 *      A failing high-risk control should hurt more than a failing low-risk one.
 *
 *   4. Criterion coverage = weighted mean of the effectiveness of every control
 *      mapped to that criterion.
 *
 *   5. Overall readiness = the plain, unweighted mean of in-scope criterion
 *      coverage. Criteria are averaged evenly on purpose: an examination does
 *      not let you pass a criterion by having lots of controls elsewhere, so a
 *      thinly covered criterion should not be diluted by a heavily covered one.
 *
 * Everything below is pure: same inputs, same numbers, no dates, no I/O.
 */

import type {
  Control,
  ControlStatus,
  Criterion,
  EvidenceStatus,
  RiskLevel,
} from "./data";

export const MATURITY_POINTS: Record<ControlStatus, number> = {
  implemented: 1.0,
  partial: 0.5,
  not_implemented: 0.0,
};

export const EVIDENCE_MULTIPLIER: Record<EvidenceStatus, number> = {
  current: 1.0,
  stale: 0.6,
  missing: 0.3,
};

export const RISK_WEIGHT: Record<RiskLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export const FORMULA_SUMMARY =
  "Readiness = mean coverage of the in-scope criteria. A criterion's coverage is the risk-weighted average of its controls, where each control scores maturity (implemented 1.0 / partial 0.5 / none 0) multiplied by an evidence factor (current 1.0 / stale 0.6 / missing 0.3).";

export type ControlScore = {
  maturity: number;
  evidenceMultiplier: number;
  effectiveness: number;
  weight: number;
};

export function scoreControl(control: Control): ControlScore {
  const maturity = MATURITY_POINTS[control.status];
  const evidenceMultiplier = EVIDENCE_MULTIPLIER[control.evidence];
  return {
    maturity,
    evidenceMultiplier,
    effectiveness: maturity * evidenceMultiplier,
    weight: RISK_WEIGHT[control.inherentRisk],
  };
}

/** A control counts as an open high risk when it is not fully implemented *and* currently evidenced. */
export function isOpenHighRisk(control: Control): boolean {
  return (
    control.inherentRisk === "high" &&
    (control.status !== "implemented" || control.evidence !== "current")
  );
}

export type CriterionScore = {
  id: string;
  category: string;
  categoryName: string;
  intent: string;
  coverage: number;
  controlIds: string[];
};

export type CategoryScore = {
  id: string;
  coverage: number;
  criteria: CriterionScore[];
  controlIds: string[];
};

export type ControlDrag = {
  controlId: string;
  title: string;
  criteria: string[];
  status: ControlStatus;
  evidence: EvidenceStatus;
  inherentRisk: RiskLevel;
  effectiveness: number;
  /** Percentage points the overall score would gain if this one control were fully remediated. */
  liftIfRemediated: number;
};

export type ReadinessResult = {
  overall: number;
  byCriterion: CriterionScore[];
  byCategory: CategoryScore[];
  counts: {
    controls: number;
    implemented: number;
    partial: number;
    notImplemented: number;
    evidenceCurrent: number;
    evidenceStale: number;
    evidenceMissing: number;
    openHighRisk: number;
    criteriaWithoutControls: number;
  };
  implementedPct: number;
  drags: ControlDrag[];
};

function meanCoverage(
  controls: Control[],
  criteria: Criterion[],
): { byCriterion: CriterionScore[]; overall: number } {
  const byCriterion = criteria.map((criterion) => {
    const mapped = controls.filter((c) => c.criteria.includes(criterion.id));
    let weighted = 0;
    let weight = 0;
    for (const control of mapped) {
      const s = scoreControl(control);
      weighted += s.effectiveness * s.weight;
      weight += s.weight;
    }
    return {
      id: criterion.id,
      category: criterion.category,
      categoryName: criterion.categoryName,
      intent: criterion.intent,
      // A criterion with no control mapped to it is a hole, not a pass.
      coverage: weight === 0 ? 0 : (weighted / weight) * 100,
      controlIds: mapped.map((c) => c.id),
    };
  });

  const overall =
    byCriterion.length === 0
      ? 0
      : byCriterion.reduce((sum, c) => sum + c.coverage, 0) / byCriterion.length;

  return { byCriterion, overall };
}

/** Overall readiness only — used for "what if we fixed these" projections. */
export function overallReadiness(
  controls: Control[],
  criteria: Criterion[],
): number {
  return meanCoverage(controls, criteria).overall;
}

/** Returns a copy of the control set with the given controls treated as implemented and currently evidenced. */
export function remediate(controls: Control[], controlIds: string[]): Control[] {
  const target = new Set(controlIds);
  return controls.map((c) =>
    target.has(c.id)
      ? { ...c, status: "implemented" as const, evidence: "current" as const }
      : c,
  );
}

/** Readiness the company would reach if every listed control were implemented with current evidence. */
export function projectReadiness(
  controls: Control[],
  criteria: Criterion[],
  controlIds: string[],
): number {
  return overallReadiness(remediate(controls, controlIds), criteria);
}

export function computeReadiness(
  controls: Control[],
  criteria: Criterion[],
): ReadinessResult {
  const { byCriterion, overall } = meanCoverage(controls, criteria);

  const categoryIds: string[] = [];
  for (const c of byCriterion) {
    if (!categoryIds.includes(c.category)) categoryIds.push(c.category);
  }

  const byCategory: CategoryScore[] = categoryIds.map((id) => {
    const members = byCriterion.filter((c) => c.category === id);
    const controlIds = Array.from(
      new Set(members.flatMap((m) => m.controlIds)),
    );
    return {
      id,
      coverage:
        members.reduce((sum, m) => sum + m.coverage, 0) / (members.length || 1),
      criteria: members,
      controlIds,
    };
  });

  const drags: ControlDrag[] = controls
    .map((control) => {
      const score = scoreControl(control);
      const lift =
        projectReadiness(controls, criteria, [control.id]) - overall;
      return {
        controlId: control.id,
        title: control.title,
        criteria: control.criteria,
        status: control.status,
        evidence: control.evidence,
        inherentRisk: control.inherentRisk,
        effectiveness: score.effectiveness,
        liftIfRemediated: lift,
      };
    })
    .filter((d) => d.liftIfRemediated > 0.0001)
    .sort((a, b) => b.liftIfRemediated - a.liftIfRemediated);

  const counts = {
    controls: controls.length,
    implemented: controls.filter((c) => c.status === "implemented").length,
    partial: controls.filter((c) => c.status === "partial").length,
    notImplemented: controls.filter((c) => c.status === "not_implemented")
      .length,
    evidenceCurrent: controls.filter((c) => c.evidence === "current").length,
    evidenceStale: controls.filter((c) => c.evidence === "stale").length,
    evidenceMissing: controls.filter((c) => c.evidence === "missing").length,
    openHighRisk: controls.filter(isOpenHighRisk).length,
    criteriaWithoutControls: byCriterion.filter(
      (c) => c.controlIds.length === 0,
    ).length,
  };

  return {
    overall,
    byCriterion,
    byCategory,
    counts,
    implementedPct:
      controls.length === 0 ? 0 : (counts.implemented / controls.length) * 100,
    drags,
  };
}
