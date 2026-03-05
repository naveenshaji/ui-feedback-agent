import type { UIFeedbackEntry } from "../types";

export function buildAgentPrompt(params: {
  projectName?: string;
  pageUrl: string;
  entries: UIFeedbackEntry[];
}): string {
  const generatedAt = new Date().toISOString();
  const projectLine = params.projectName ? `Project: ${params.projectName}\n` : "";

  const feedbackBlocks = params.entries
    .map((entry, index) => {
      return [
        `### Feedback ${index + 1}`,
        `Location: ${entry.route}`,
        `Element: ${entry.tagName}`,
        `Primary selector: ${entry.selector}`,
        `Selector candidates: ${entry.selectorCandidates.join(" | ")}`,
        `Nearby text: ${entry.textSnippet}`,
        `Observed: ${entry.observed || "(not provided)"}`,
        `Requested change: ${entry.requestedChange}`,
        `Constraints: ${entry.constraints || "(none)"}`,
        `Priority: ${entry.priority}`,
        `Captured at: ${entry.createdAt}`
      ].join("\n");
    })
    .join("\n\n");

  return [
    "You are implementing UI changes from an in-browser feedback capture tool.",
    "Apply all requested updates in one pass with high visual fidelity and keep existing design language unless explicitly changed.",
    "",
    projectLine + `Page URL: ${params.pageUrl}`,
    `Generated at: ${generatedAt}`,
    `Total feedback items: ${params.entries.length}`,
    "",
    "## Requested Changes",
    feedbackBlocks,
    "",
    "## Delivery Requirements",
    "- Implement each feedback item.",
    "- Preserve responsive behavior for desktop and mobile.",
    "- Call out tradeoffs when a requested change conflicts with current layout constraints.",
    "- Return a concise change summary mapped to feedback item numbers."
  ]
    .join("\n")
    .trim();
}
