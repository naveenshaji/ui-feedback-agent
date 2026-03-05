# UI Feedback Agent

Dev-only React/Next.js overlay for capturing multi-element UI feedback and exporting one agent-ready prompt.

## Install

```bash
npm install @naveenshaji/ui-feedback-agent
```

## Usage (Next.js)

Create a client component:

```tsx
"use client";

import { UIFeedbackAgent } from "@naveenshaji/ui-feedback-agent";

export function DevFeedbackOverlay() {
  return <UIFeedbackAgent projectName="my-product" />;
}
```

Render it in your layout/page during development:

```tsx
{process.env.NODE_ENV === "development" ? <DevFeedbackOverlay /> : null}
```

## Default behavior

- Dev-only by default (`NODE_ENV !== "production"`)
- Toggle panel with `Cmd/Ctrl + Shift + U`
- Pick elements directly from the page
- Capture multiple feedback items with:
  - route and page URL
  - tag + selector(s)
  - nearby text context
  - observed/requested/constraints/priority
- Export one combined prompt with all feedback items

## API

```ts
type UIFeedbackAgentProps = {
  enabled?: boolean;
  projectName?: string;
  hotkey?: {
    key: string;
    shiftKey?: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    metaOrCtrl?: boolean;
  };
  maxTextLength?: number;
  onExport?: (payload: { prompt: string; entries: UIFeedbackEntry[] }) => void;
};
```

## Roadmap (next)

- Element screenshot capture per feedback item
- Attach viewport/device metadata
- Source-map-aware component/file hints
- MCP handoff transport for direct agent ingestion

## License

MIT
