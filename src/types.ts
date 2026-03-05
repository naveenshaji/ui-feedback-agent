export type UIFeedbackPriority = "low" | "medium" | "high";

export interface UIFeedbackHotkey {
  key: string;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  metaOrCtrl?: boolean;
}

export interface UIFeedbackEntry {
  id: string;
  pageUrl: string;
  route: string;
  tagName: string;
  selector: string;
  selectorCandidates: string[];
  textSnippet: string;
  observed: string;
  requestedChange: string;
  constraints: string;
  priority: UIFeedbackPriority;
  createdAt: string;
}

export interface UIFeedbackExportPayload {
  prompt: string;
  entries: UIFeedbackEntry[];
}

export interface UIFeedbackAgentProps {
  enabled?: boolean;
  projectName?: string;
  hotkey?: UIFeedbackHotkey;
  maxTextLength?: number;
  onExport?: (payload: UIFeedbackExportPayload) => void;
}
