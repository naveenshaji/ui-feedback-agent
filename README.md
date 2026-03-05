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
- Press `Cmd/Ctrl + Shift + U` to toggle feedback mode directly
- In feedback mode, click any element to open an inline comment box near that element
- Press `Enter` to stage a comment quickly (`Shift + Enter` for newline)
- A small numbered marker stays attached to commented elements
- Use bottom-right `Feedback` button to review all staged comments, copy prompt, or clear all
- Export includes:
  - route and page URL
  - tag + selector(s)
  - nearby text context
  - requested change text
- Export one combined prompt with all feedback items

## Demo app (rapid testing + screenshots)

This repo includes a minimal Next.js demo at `/demo`.

```bash
npm run demo:install
npm run demo:dev
```

Then open `http://localhost:3200` and use `Cmd/Ctrl + Shift + U`.

You can also run a production sanity check:

```bash
npm run demo:build
```

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

## npm publish pipeline

GitHub Actions workflow: `.github/workflows/npm-publish.yml`

- Triggers on version tags like `v0.1.1` (and manual dispatch)
- Runs `typecheck`, `build`, and `npm pack --dry-run`
- Publishes with `npm publish --access public --provenance`

Required GitHub secret:

- `NPM_TOKEN` (npm automation token with publish access to this package scope)

## License

MIT
