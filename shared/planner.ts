export const suitabilityQuestions = [
  "I am planning under Ontario law.",
  "I understand this software is not legal advice.",
  "I can seek professional advice when the service recommends it.",
] as const;

export function isSuitabilityComplete(checks: readonly boolean[]) {
  return checks.length === suitabilityQuestions.length && checks.every(Boolean);
}
