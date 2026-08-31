import { describe, expect, it } from "vitest";
import { isSuitabilityComplete, suitabilityQuestions } from "../shared/planner";

describe("Ontario planner suitability", () => {
  it("requires every suitability acknowledgement", () => {
    expect(suitabilityQuestions).toHaveLength(3);
    expect(isSuitabilityComplete([true, true, false])).toBe(false);
    expect(isSuitabilityComplete([true, true, true])).toBe(true);
  });

  it("rejects malformed checkbox arrays", () => {
    expect(isSuitabilityComplete([])).toBe(false);
    expect(isSuitabilityComplete([true, true, true, true])).toBe(false);
  });
});
