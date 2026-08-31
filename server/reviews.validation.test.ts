import { describe, expect, it } from "vitest";
import { nextReviewStatus } from "../shared/reviews";

describe("review status transitions", () => {
  it("advances a request through the operator workflow", () => {
    expect(nextReviewStatus("queued")).toBe("assigned");
    expect(nextReviewStatus("assigned")).toBe("completed");
    expect(nextReviewStatus("completed")).toBe("closed");
    expect(nextReviewStatus("closed")).toBeNull();
  });
});
