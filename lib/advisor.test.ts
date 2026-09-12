import { describe, expect, it } from "vitest";
import { buildAdvisorContext, offlineAnswer } from "./advisor";
import { getControls, getCriteria } from "./data";
import { computeReadiness } from "./scoring";

describe("buildAdvisorContext", () => {
  const { context, readiness } = buildAdvisorContext();

  it("agrees with the score the rest of the app renders", () => {
    const expected = computeReadiness(getControls(), getCriteria()).overall;
    expect(readiness).toBeCloseTo(expected);
    expect(context).toContain(expected.toFixed(1));
  });

  it("carries the scoping decision, since it frames every other number", () => {
    expect(context).toContain("IN SCOPE");
    expect(context).toContain("OUT OF SCOPE");
    expect(context).toContain("Type II");
  });

  it("includes the ranked gaps and every access conflict", () => {
    expect(context).toContain("TOP RANKED GAPS");
    expect(context).toContain("SOD FINDINGS");
    expect(context).toContain("SEGREGATION OF DUTIES");
  });

  it("stays compact enough to stay cheap", () => {
    // Roughly four characters per token; this keeps the call well under
    // 10k input tokens.
    expect(context.length).toBeLessThan(24_000);
  });
});

describe("offlineAnswer", () => {
  it("returns real figures rather than an error string", () => {
    const answer = offlineAnswer();
    const overall = computeReadiness(getControls(), getCriteria()).overall;
    expect(answer).toContain(`${overall.toFixed(0)}%`);
    expect(answer).toContain("CTRL-");
    expect(answer.length).toBeGreaterThan(200);
  });
});
