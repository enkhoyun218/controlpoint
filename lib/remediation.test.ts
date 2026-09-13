import { describe, expect, it } from "vitest";
import type { Control, Criterion } from "./data";
import { getControls, getCriteria } from "./data";
import {
  estimateEffort,
  isGap,
  midSentence,
  projectTopN,
  rankGaps,
} from "./remediation";
import { overallReadiness } from "./scoring";

function control(over: Partial<Control> & { id: string }): Control {
  return {
    title: "Test control",
    description: "",
    criteria: ["CC6.1"],
    status: "implemented",
    evidence: "current",
    evidenceType: "Ticket sample",
    owner: "IT Manager",
    frequency: "quarterly",
    lastTested: "2025-12-01",
    inherentRisk: "medium",
    expectedEvidenceIntervalDays: 110,
    ...over,
  };
}

const CRIT = (id: string): Criterion => ({
  id,
  category: id.split(".")[0],
  categoryName: "Test",
  intent: "Access is managed based on roles and least privilege.",
});

describe("isGap", () => {
  it("treats an implemented control with stale evidence as a gap", () => {
    expect(isGap(control({ id: "A", evidence: "stale" }))).toBe(true);
  });

  it("does not treat a fully implemented, currently evidenced control as a gap", () => {
    expect(isGap(control({ id: "A" }))).toBe(false);
  });
});

describe("estimateEffort", () => {
  it("rates re-evidencing a control that already runs as low effort", () => {
    expect(
      estimateEffort(control({ id: "A", evidence: "stale", frequency: "annual" })),
    ).toBe("low");
  });

  it("rates building a missing control as high effort", () => {
    expect(
      estimateEffort(
        control({ id: "A", status: "not_implemented", evidence: "missing" }),
      ),
    ).toBe("high");
  });

  it("charges more for a continuous technical control than an annual one", () => {
    const annual = estimateEffort(
      control({ id: "A", status: "partial", frequency: "annual" }),
    );
    const continuous = estimateEffort(
      control({ id: "B", status: "partial", frequency: "continuous" }),
    );
    expect(annual).toBe("medium");
    expect(continuous).toBe("high");
  });
});

describe("midSentence", () => {
  it("lowers an ordinary capitalized first word", () => {
    expect(midSentence("Signed acknowledgement export")).toBe(
      "signed acknowledgement export",
    );
  });

  it("leaves an acronym alone", () => {
    for (const name of [
      "LMS completion report",
      "SoD conflict matrix and review",
      "BC/DR plan and test results",
      "MDM fleet compliance report",
      "JIT grant logs and privileged role inventory",
      "IdP configuration export and MFA coverage report",
      "TLS scan results and load balancer config",
      "SIEM alert rules and sample alerts",
    ]) {
      expect(midSentence(name)).toBe(name);
    }
  });

  it("leaves a product name alone", () => {
    expect(midSentence("Terraform PR history and drift reports")).toBe(
      "Terraform PR history and drift reports",
    );
  });

  it("never touches acronyms after the first word", () => {
    expect(midSentence("Contract clause review and SOC 2 review memos")).toBe(
      "contract clause review and SOC 2 review memos",
    );
    expect(midSentence("Executed NDAs")).toBe("executed NDAs");
    expect(
      midSentence("Infrastructure changes made through version-controlled IaC"),
    ).toBe("infrastructure changes made through version-controlled IaC");
  });

  it("handles a hyphenated first word", () => {
    expect(midSentence("Self-assessment attestations")).toBe(
      "self-assessment attestations",
    );
  });

  it("survives an empty string", () => {
    expect(midSentence("")).toBe("");
  });
});

describe("rankGaps", () => {
  const criteria = [CRIT("CC6.1"), CRIT("CC8.1")];

  it("returns one gap per failing control and ignores clean ones", () => {
    const gaps = rankGaps(
      [
        control({ id: "A", status: "partial" }),
        control({ id: "B" }),
        control({ id: "C", evidence: "missing" }),
      ],
      criteria,
    );
    expect(gaps.map((g) => g.controlId).sort()).toEqual(["A", "C"]);
  });

  it("scales the top priority to 100 and orders descending", () => {
    const gaps = rankGaps(
      [
        control({ id: "A", status: "not_implemented", inherentRisk: "high" }),
        control({ id: "B", evidence: "stale", inherentRisk: "low" }),
      ],
      criteria,
    );
    expect(gaps[0].priorityScore).toBeCloseTo(100);
    for (let i = 1; i < gaps.length; i += 1) {
      expect(gaps[i - 1].priorityScore).toBeGreaterThanOrEqual(
        gaps[i].priorityScore,
      );
    }
  });

  it("prefers the cheap fix when two gaps return the same readiness points", () => {
    // Same criterion, same risk, same shortfall — only effort differs.
    const gaps = rankGaps(
      [
        control({
          id: "CHEAP",
          status: "implemented",
          evidence: "stale",
          frequency: "annual",
        }),
        control({
          id: "COSTLY",
          status: "implemented",
          evidence: "stale",
          frequency: "continuous",
        }),
      ],
      [CRIT("CC6.1")],
    );
    expect(gaps[0].controlId).toBe("CHEAP");
  });

  it("weights a high-risk gap above an identical low-risk one", () => {
    const gaps = rankGaps(
      [
        control({ id: "LOW", status: "partial", inherentRisk: "low" }),
        control({ id: "HIGH", status: "partial", inherentRisk: "high" }),
      ],
      [CRIT("CC6.1")],
    );
    expect(gaps[0].controlId).toBe("HIGH");
  });

  it("writes an action that names the owner and the evidence to retain", () => {
    const [gap] = rankGaps(
      [control({ id: "A", evidence: "stale", owner: "Controller", evidenceType: "Reconciliation sign-off" })],
      [CRIT("CC6.1")],
    );
    expect(gap.recommendedAction).toContain("Controller");
    expect(gap.recommendedAction.toLowerCase()).toContain(
      "reconciliation sign-off",
    );
  });

  it("attaches SoD findings to access controls that should have caught them", () => {
    const gaps = rankGaps(
      [
        control({ id: "ACCESS", criteria: ["CC6.3"], status: "partial" }),
        control({ id: "OTHER", criteria: ["CC8.1"], status: "partial" }),
      ],
      [CRIT("CC6.3"), CRIT("CC8.1")],
      { sodViolationCount: 14, sodHighSeverityCount: 9 },
    );
    expect(
      gaps.find((g) => g.controlId === "ACCESS")?.supportingFinding,
    ).toContain("14");
    expect(
      gaps.find((g) => g.controlId === "OTHER")?.supportingFinding,
    ).toBeUndefined();
  });
});

describe("projectTopN", () => {
  const controls = getControls();
  const criteria = getCriteria();
  const gaps = rankGaps(controls, criteria);
  const projections = projectTopN(controls, criteria, gaps);

  it("starts from today's readiness and only ever improves it", () => {
    const today = overallReadiness(controls, criteria);
    expect(projections[0].from).toBeCloseTo(today);
    for (const p of projections) expect(p.to).toBeGreaterThan(p.from);
  });

  it("is monotonic — closing more gaps never lowers the score", () => {
    for (let i = 1; i < projections.length; i += 1) {
      expect(projections[i].to).toBeGreaterThanOrEqual(projections[i - 1].to);
    }
  });

  it("reaches 100% once every gap is closed", () => {
    expect(projections[projections.length - 1].to).toBeCloseTo(100);
  });
});

describe("the real dataset", () => {
  const gaps = rankGaps(getControls(), getCriteria(), {
    sodViolationCount: 14,
    sodHighSeverityCount: 9,
  });

  it("produces well more than the three prioritized actions required", () => {
    expect(gaps.length).toBeGreaterThanOrEqual(20);
  });

  it("gives every gap an action, a reason, an effort, and a real lift", () => {
    for (const gap of gaps) {
      expect(gap.recommendedAction.length).toBeGreaterThan(40);
      expect(gap.whyItMatters.length).toBeGreaterThan(40);
      expect(["low", "medium", "high"]).toContain(gap.effort);
      expect(gap.readinessLift).toBeGreaterThan(0);
      expect(gap.criteria.length).toBeGreaterThan(0);
    }
  });

  it("puts at least one high-risk item at the top of the plan", () => {
    expect(gaps.slice(0, 5).some((g) => g.inherentRisk === "high")).toBe(true);
  });

  it("never lowercases an acronym in a headline or an action", () => {
    // "patch slas", "version-controlled iac", "the bc/dr plan" — all previously shipped.
    const corrupted = /\b(soc 2|lms|sod|bc\/dr|mdm|jit|siem|idp|tls|sla|slas|iac|mfa|sso|ci\/cd|api|ir plan|terraform pr)\b/;
    for (const gap of gaps) {
      for (const text of [gap.title, gap.recommendedAction, gap.whyItMatters]) {
        expect(text).not.toMatch(corrupted);
      }
    }
  });

  it("only claims a criterion is unaddressed when no other control covers it", () => {
    const controls = getControls();
    for (const gap of gaps.filter((g) => g.status === "not_implemented")) {
      const siblings = controls.filter(
        (c) =>
          c.id !== gap.controlId &&
          c.criteria.some((x) => gap.criteria.includes(x)),
      );
      if (siblings.length > 0) {
        expect(gap.whyItMatters).not.toContain("Nothing addresses");
        expect(gap.whyItMatters).toContain("other control");
      } else {
        expect(gap.whyItMatters).toContain("Nothing addresses");
      }
    }
  });

  it("still finds one genuinely unaddressed criterion — C1.2", () => {
    const orphan = gaps.find((g) => g.criteria.includes("C1.2"));
    expect(orphan?.whyItMatters).toContain("Nothing addresses C1.2");
  });
});
