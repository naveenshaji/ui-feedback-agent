import type { UIFeedbackEntry } from "../types";

export function buildAgentPrompt(params: {
  projectName?: string;
  pageUrl: string;
  entries: UIFeedbackEntry[];
}): string {
  const generatedAt = new Date().toISOString();
  const projectLine = params.projectName ? `Project: ${params.projectName}\n` : "";
  const uniqueRoutes = Array.from(
    new Set(
      params.entries
        .map((entry) => entry.route.trim())
        .filter(Boolean)
    )
  );
  const hasMultipleRoutes = uniqueRoutes.length > 1;

  const feedbackBlocks = params.entries
    .map((entry, index) => {
      const lines = [
        `### Feedback ${index + 1}`,
        `Target selector: ${entry.selector}`,
        `Nearby text: ${entry.textSnippet}`,
        `Requested change: ${entry.requestedChange}`
      ];

      if (hasMultipleRoutes) {
        lines.splice(1, 0, `Location: ${entry.route || "/"}`);
      }

      if (entry.constraints.trim()) {
        lines.push(`Constraints: ${entry.constraints.trim()}`);
      }

      if (entry.priority !== "medium") {
        lines.push(`Priority: ${entry.priority}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");

  return [
    "You are implementing UI changes from an in-browser feedback capture tool.",
    "Apply all requested updates in one pass with high visual fidelity and keep existing design language unless explicitly changed.",
    "",
    projectLine + `Page URL: ${params.pageUrl}`,
    `Location${uniqueRoutes.length === 1 ? "" : "s"}: ${uniqueRoutes.length > 0 ? uniqueRoutes.join(", ") : "/"}`,
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
