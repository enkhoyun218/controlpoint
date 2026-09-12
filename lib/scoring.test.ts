import { describe, expect, it } from "vitest";
import type { Control, Criterion } from "./data";
import {
  computeReadiness,
  isOpenHighRisk,
  overallReadiness,
  projectReadiness,
  scoreControl,
} from "./scoring";
import { getControls, getCriteria } from "./data";

function control(over: Partial<Control> & { id: string }): Control {
  return {
    title: "Test control",
    description: "",
    criteria: ["CC6.1"],
    status: "implemented",
    evidence: "current",
    evidenceType: "Sample",
    owner: "Owner",
    frequency: "annual",
    lastTested: "2025-12-01",
    inherentRisk: "medium",
    expectedEvidenceIntervalDays: 380,
    ...over,
  };
}

const CRIT = (id: string): Criterion => ({
  id,
  category: id.split(".")[0],
  categoryName: "Test",
  intent: "",
});

describe("scoreControl", () => {
  it("gives a fully implemented, currently evidenced control full marks", () => {
    expect(scoreControl(control({ id: "A" })).effectiveness).toBe(1);
  });

  it("halves a partially implemented control", () => {
    expect(
      scoreControl(control({ id: "A", status: "partial" })).effectiveness,
    ).toBe(0.5);
  });

  it("discounts an implemented control whose evidence is stale", () => {
    // The Type II case that matters: the control exists, but nobody can show
    // it ran all period.
    expect(
      scoreControl(control({ id: "A", evidence: "stale" })).effectiveness,
    ).toBeCloseTo(0.6);
  });

  it("scores an unimplemented control at zero regardless of evidence", () => {
    expect(
      scoreControl(control({ id: "A", status: "not_implemented" }))
        .effectiveness,
    ).toBe(0);
  });

  it("weights high inherent risk above low", () => {
    expect(scoreControl(control({ id: "A", inherentRisk: "high" })).weight).toBe(
      3,
    );
    expect(scoreControl(control({ id: "A", inherentRisk: "low" })).weight).toBe(
      1,
    );
  });
});

describe("criterion coverage", () => {
  it("is the risk-weighted average of its mapped controls", () => {
    const controls = [
      control({ id: "A", inherentRisk: "high", status: "implemented" }), // 1.0 x weight 3
      control({ id: "B", inherentRisk: "low", status: "not_implemented" }), // 0.0 x weight 1
    ];
    const { byCriterion } = computeReadiness(controls, [CRIT("CC6.1")]);
    // (1*3 + 0*1) / (3 + 1) = 0.75
    expect(byCriterion[0].coverage).toBeCloseTo(75);
  });

  it("treats a criterion with no mapped controls as zero, not as a pass", () => {
    const { byCriterion, overall } = computeReadiness(
      [control({ id: "A", criteria: ["CC6.1"] })],
      [CRIT("CC6.1"), CRIT("CC7.1")],
    );
    expect(byCriterion[1].coverage).toBe(0);
    expect(overall).toBeCloseTo(50);
  });

  it("counts a control once per criterion it is mapped to", () => {
    const { byCriterion } = computeReadiness(
      [control({ id: "A", criteria: ["CC6.1", "CC8.1"], status: "partial" })],
      [CRIT("CC6.1"), CRIT("CC8.1")],
    );
    expect(byCriterion.map((c) => c.coverage)).toEqual([50, 50]);
  });
});

describe("overall readiness", () => {
  it("averages criteria evenly so a thinly covered criterion is not diluted", () => {
    const controls = [
      control({ id: "A", criteria: ["CC6.1"] }),
      control({ id: "B", criteria: ["CC6.1"] }),
      control({ id: "C", criteria: ["CC6.1"] }),
      control({ id: "D", criteria: ["CC8.1"], status: "not_implemented" }),
    ];
    // Three good controls on one criterion cannot rescue the other criterion.
    expect(overallReadiness(controls, [CRIT("CC6.1"), CRIT("CC8.1")])).toBe(50);
  });

  it("returns 0 with no criteria rather than dividing by zero", () => {
    expect(overallReadiness([], [])).toBe(0);
  });
});

describe("projectReadiness", () => {
  it("raises the score to 100 when every control is remediated", () => {
    const controls = [
      control({ id: "A", status: "not_implemented", evidence: "missing" }),
      control({ id: "B", criteria: ["CC8.1"], evidence: "stale" }),
    ];
    const criteria = [CRIT("CC6.1"), CRIT("CC8.1")];
    expect(projectReadiness(controls, criteria, ["A", "B"])).toBeCloseTo(100);
  });

  it("does not mutate the controls passed in", () => {
    const controls = [control({ id: "A", status: "not_implemented" })];
    projectReadiness(controls, [CRIT("CC6.1")], ["A"]);
    expect(controls[0].status).toBe("not_implemented");
  });
});

describe("isOpenHighRisk", () => {
  it("flags a high-risk control that is implemented but has stale evidence", () => {
    expect(
      isOpenHighRisk(control({ id: "A", inherentRisk: "high", evidence: "stale" })),
    ).toBe(true);
  });

  it("does not flag a clean high-risk control", () => {
    expect(isOpenHighRisk(control({ id: "A", inherentRisk: "high" }))).toBe(
      false,
    );
  });

  it("does not flag a failing low-risk control", () => {
    expect(
      isOpenHighRisk(
        control({ id: "A", inherentRisk: "low", status: "not_implemented" }),
      ),
    ).toBe(false);
  });
});

describe("the real dataset", () => {
  const result = computeReadiness(getControls(), getCriteria());

  it("scores somewhere a real pre-audit company would sit", () => {
    expect(result.overall).toBeGreaterThan(40);
    expect(result.overall).toBeLessThan(95);
  });

  it("maps every modeled criterion to at least one control", () => {
    expect(result.counts.criteriaWithoutControls).toBe(0);
  });

  it("ranks the biggest drag first and every drag is a real gain", () => {
    expect(result.drags.length).toBeGreaterThan(5);
    for (let i = 1; i < result.drags.length; i += 1) {
      expect(result.drags[i - 1].liftIfRemediated).toBeGreaterThanOrEqual(
        result.drags[i].liftIfRemediated,
      );
    }
    expect(result.drags.every((d) => d.liftIfRemediated > 0)).toBe(true);
  });

  it("reaches 100% only when everything is remediated", () => {
    const all = getControls().map((c) => c.id);
    expect(projectReadiness(getControls(), getCriteria(), all)).toBeCloseTo(100);
  });
});
