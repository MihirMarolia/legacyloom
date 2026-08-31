export type ReviewStatus = "queued" | "assigned" | "completed" | "closed";

export function nextReviewStatus(status: ReviewStatus): ReviewStatus | null {
  if (status === "queued") return "assigned";
  if (status === "assigned") return "completed";
  if (status === "completed") return "closed";
  return null;
}
