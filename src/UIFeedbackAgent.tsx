import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import type { UIFeedbackAgentProps, UIFeedbackEntry, UIFeedbackHotkey, UIFeedbackPriority } from "./types";
import { getElementContext } from "./utils/dom-context";
import { buildAgentPrompt } from "./utils/prompt";

const ROOT_ATTR = "data-uifa-root";
const STYLE_ID = "uifa-styles";

const DEFAULT_HOTKEY: UIFeedbackHotkey = {
  key: "u",
  shiftKey: true,
  metaOrCtrl: true
};

const OVERLAY_STYLES = `
.uifa-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6; }
.uifa-btn, .uifa-panel, .uifa-banner, .uifa-highlight { pointer-events: auto; }
.uifa-btn { position: fixed; right: 20px; bottom: 20px; border: 1px solid rgba(255,255,255,0.25); background: rgba(16, 20, 28, 0.96); color: #fff; border-radius: 999px; padding: 10px 14px; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 10px 28px rgba(0,0,0,0.35); }
.uifa-btn:hover { background: rgba(24, 30, 44, 0.98); }
.uifa-panel { position: fixed; right: 20px; top: 20px; width: min(420px, calc(100vw - 40px)); max-height: calc(100vh - 40px); overflow: auto; border: 1px solid rgba(255,255,255,0.18); background: rgba(11, 15, 24, 0.96); border-radius: 14px; box-shadow: 0 24px 48px rgba(0,0,0,0.5); backdrop-filter: blur(8px); }
.uifa-panel-inner { padding: 14px; display: grid; gap: 12px; }
.uifa-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.uifa-title { font-size: 14px; font-weight: 700; letter-spacing: 0.02em; }
.uifa-sub { font-size: 11px; color: #aeb9cb; line-height: 1.4; }
.uifa-chip { font-size: 10px; color: #c2d4ff; border: 1px solid rgba(115, 155, 255, 0.45); padding: 2px 8px; border-radius: 999px; }
.uifa-controls { display: flex; gap: 8px; flex-wrap: wrap; }
.uifa-secondary-btn { border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.04); color: #ecf0f8; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
.uifa-secondary-btn:hover { background: rgba(255,255,255,0.1); }
.uifa-secondary-btn.active { border-color: rgba(88, 169, 255, 0.8); color: #d9eeff; background: rgba(71, 139, 233, 0.22); }
.uifa-field { display: grid; gap: 6px; }
.uifa-label { font-size: 11px; color: #b8c4d8; text-transform: uppercase; letter-spacing: 0.06em; }
.uifa-input, .uifa-textarea, .uifa-select { width: 100%; box-sizing: border-box; border: 1px solid rgba(255,255,255,0.2); background: rgba(7, 10, 16, 0.92); color: #f7faff; border-radius: 8px; padding: 8px 9px; font-size: 12px; }
.uifa-textarea { min-height: 64px; resize: vertical; }
.uifa-note { border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; padding: 10px; display: grid; gap: 8px; background: rgba(255,255,255,0.02); }
.uifa-note-header { display: flex; justify-content: space-between; gap: 8px; }
.uifa-note-title { font-size: 12px; font-weight: 600; color: #e8eefb; }
.uifa-note-meta { font-size: 11px; color: #98a6bc; line-height: 1.35; }
.uifa-link-btn { border: none; background: transparent; color: #86c5ff; cursor: pointer; padding: 0; font-size: 11px; }
.uifa-banner { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(58, 122, 255, 0.92); border: 1px solid rgba(164, 199, 255, 0.7); color: #f8fbff; border-radius: 999px; padding: 7px 12px; font-size: 12px; box-shadow: 0 14px 28px rgba(20, 50, 110, 0.35); }
.uifa-highlight { position: fixed; border: 2px solid rgba(73, 160, 255, 0.95); background: rgba(73, 160, 255, 0.18); box-shadow: 0 0 0 1px rgba(255,255,255,0.65) inset; pointer-events: none; }
.uifa-divider { height: 1px; background: rgba(255,255,255,0.11); margin: 2px 0; }
`;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface DraftState {
  tagName: string;
  selector: string;
  selectorCandidates: string[];
  textSnippet: string;
  observed: string;
  requestedChange: string;
  constraints: string;
  priority: UIFeedbackPriority;
}

function createEmptyDraft(): DraftState {
  return {
    tagName: "",
    selector: "",
    selectorCandidates: [],
    textSnippet: "",
    observed: "",
    requestedChange: "",
    constraints: "",
    priority: "medium"
  };
}

function matchHotkey(event: KeyboardEvent, hotkey: UIFeedbackHotkey): boolean {
  if (event.key.toLowerCase() !== hotkey.key.toLowerCase()) {
    return false;
  }

  if (hotkey.shiftKey !== undefined && event.shiftKey !== hotkey.shiftKey) {
    return false;
  }

  if (hotkey.altKey !== undefined && event.altKey !== hotkey.altKey) {
    return false;
  }

  if (hotkey.ctrlKey !== undefined && event.ctrlKey !== hotkey.ctrlKey) {
    return false;
  }

  if (hotkey.metaKey !== undefined && event.metaKey !== hotkey.metaKey) {
    return false;
  }

  if (hotkey.metaOrCtrl && !(event.metaKey || event.ctrlKey)) {
    return false;
  }

  return true;
}

function elementFromEvent(event: MouseEvent): Element | null {
  const target = document.elementFromPoint(event.clientX, event.clientY);
  if (!target) {
    return null;
  }

  if (target.closest(`[${ROOT_ATTR}]`)) {
    return null;
  }

  return target;
}

function isDevByDefault(): boolean {
  const env = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;
  if (!env) {
    return true;
  }

  return env !== "production";
}

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return Promise.resolve();
}

export function UIFeedbackAgent(props: UIFeedbackAgentProps): ReactElement | null {
  const enabled = props.enabled ?? isDevByDefault();
  const hotkey = props.hotkey ?? DEFAULT_HOTKEY;
  const maxTextLength = props.maxTextLength ?? 220;

  const [mounted, setMounted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pickerActive, setPickerActive] = useState(false);
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(createEmptyDraft());
  const [entries, setEntries] = useState<UIFeedbackEntry[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const pageUrl = mounted ? window.location.href : "";
  const route = mounted
    ? `${window.location.pathname}${window.location.search}${window.location.hash}`
    : "";

  const prompt = useMemo(() => {
    return buildAgentPrompt({
      projectName: props.projectName,
      pageUrl,
      entries
    });
  }, [entries, pageUrl, props.projectName]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setMounted(true);

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = OVERLAY_STYLES;
      document.head.appendChild(style);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !mounted) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!matchHotkey(event, hotkey)) {
        if (event.key === "Escape" && pickerActive) {
          setPickerActive(false);
          setHighlightRect(null);
        }
        return;
      }

      event.preventDefault();
      setPanelOpen((value) => !value);
      setPickerActive(false);
      setHighlightRect(null);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, hotkey, mounted, pickerActive]);

  useEffect(() => {
    if (!enabled || !pickerActive) {
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      const element = elementFromEvent(event);
      if (!element) {
        setHighlightRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      setHighlightRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    };

    const onClick = (event: MouseEvent) => {
      const element = elementFromEvent(event);
      if (!element) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const context = getElementContext(element, maxTextLength);
      setDraft({
        ...context,
        observed: context.textSnippet === "(no nearby text content)"
          ? `Update this ${context.tagName} element.`
          : `Current content: ${context.textSnippet}`,
        requestedChange: "",
        constraints: "",
        priority: "medium"
      });

      setDraftOpen(true);
      setPanelOpen(true);
      setPickerActive(false);
      setHighlightRect(null);
    };

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [enabled, pickerActive, maxTextLength]);

  if (!enabled || !mounted) {
    return null;
  }

  const saveDraft = () => {
    if (!draft.requestedChange.trim()) {
      return;
    }

    const entry: UIFeedbackEntry = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      pageUrl,
      route,
      tagName: draft.tagName,
      selector: draft.selector,
      selectorCandidates: draft.selectorCandidates,
      textSnippet: draft.textSnippet,
      observed: draft.observed.trim(),
      requestedChange: draft.requestedChange.trim(),
      constraints: draft.constraints.trim(),
      priority: draft.priority,
      createdAt: new Date().toISOString()
    };

    setEntries((value) => [entry, ...value]);
    setDraft(createEmptyDraft());
    setDraftOpen(false);
  };

  const copyPrompt = async () => {
    try {
      await copyText(prompt);
      setCopyState("copied");
      props.onExport?.({ prompt, entries });
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  const root = (
    <div className="uifa-root" {...{ [ROOT_ATTR]: "true" }}>
      <button className="uifa-btn" onClick={() => setPanelOpen((value) => !value)} type="button">
        UI Feedback {entries.length > 0 ? `(${entries.length})` : ""}
      </button>

      {pickerActive && <div className="uifa-banner">Picker active. Click an element to add feedback. Esc to cancel.</div>}

      {highlightRect && pickerActive ? (
        <div
          className="uifa-highlight"
          style={{
            top: `${highlightRect.top}px`,
            left: `${highlightRect.left}px`,
            width: `${highlightRect.width}px`,
            height: `${highlightRect.height}px`
          }}
        />
      ) : null}

      {panelOpen ? (
        <section className="uifa-panel">
          <div className="uifa-panel-inner">
            <div className="uifa-row">
              <div>
                <div className="uifa-title">UI Feedback for Agents</div>
                <div className="uifa-sub">Hotkey: {hotkey.metaOrCtrl ? "Cmd/Ctrl" : hotkey.metaKey ? "Cmd" : hotkey.ctrlKey ? "Ctrl" : ""}{hotkey.shiftKey ? " + Shift" : ""} + {hotkey.key.toUpperCase()}</div>
              </div>
              <button className="uifa-secondary-btn" onClick={() => setPanelOpen(false)} type="button">Close</button>
            </div>

            <div className="uifa-sub">Route: {route || "/"}</div>

            <div className="uifa-controls">
              <button
                className={`uifa-secondary-btn ${pickerActive ? "active" : ""}`}
                onClick={() => {
                  setPickerActive((value) => !value);
                  setDraftOpen(false);
                }}
                type="button"
              >
                {pickerActive ? "Stop Picking" : "Pick Element"}
              </button>

              <button className="uifa-secondary-btn" type="button" onClick={() => setEntries([])}>
                Clear All
              </button>
            </div>

            {draftOpen ? (
              <>
                <div className="uifa-divider" />
                <div className="uifa-row">
                  <div className="uifa-title">New Feedback</div>
                  <span className="uifa-chip">{draft.tagName || "element"}</span>
                </div>

                <div className="uifa-sub">Selector: {draft.selector}</div>
                <div className="uifa-sub">Nearby text: {draft.textSnippet}</div>

                <label className="uifa-field">
                  <span className="uifa-label">Observed</span>
                  <textarea
                    className="uifa-textarea"
                    value={draft.observed}
                    onChange={(event) => setDraft((value) => ({ ...value, observed: event.target.value }))}
                  />
                </label>

                <label className="uifa-field">
                  <span className="uifa-label">Requested Change</span>
                  <textarea
                    className="uifa-textarea"
                    value={draft.requestedChange}
                    onChange={(event) => setDraft((value) => ({ ...value, requestedChange: event.target.value }))}
                    placeholder="Describe what should change and how it should feel."
                  />
                </label>

                <label className="uifa-field">
                  <span className="uifa-label">Constraints</span>
                  <input
                    className="uifa-input"
                    value={draft.constraints}
                    onChange={(event) => setDraft((value) => ({ ...value, constraints: event.target.value }))}
                    placeholder="Optional: keep spacing, preserve brand style, keep mobile layout, ..."
                  />
                </label>

                <label className="uifa-field">
                  <span className="uifa-label">Priority</span>
                  <select
                    className="uifa-select"
                    value={draft.priority}
                    onChange={(event) => setDraft((value) => ({
                      ...value,
                      priority: event.target.value as UIFeedbackPriority
                    }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>

                <div className="uifa-controls">
                  <button className="uifa-secondary-btn active" onClick={saveDraft} type="button">
                    Save Feedback
                  </button>
                  <button
                    className="uifa-secondary-btn"
                    onClick={() => {
                      setDraftOpen(false);
                      setDraft(createEmptyDraft());
                    }}
                    type="button"
                  >
                    Discard
                  </button>
                </div>
              </>
            ) : null}

            <div className="uifa-divider" />
            <div className="uifa-row">
              <div className="uifa-title">Captured Items</div>
              <div className="uifa-sub">{entries.length} total</div>
            </div>

            {entries.length === 0 ? (
              <div className="uifa-sub">No feedback yet. Click Pick Element to start.</div>
            ) : (
              entries.map((entry) => (
                <article className="uifa-note" key={entry.id}>
                  <div className="uifa-note-header">
                    <div>
                      <div className="uifa-note-title">{entry.requestedChange}</div>
                      <div className="uifa-note-meta">{entry.selector}</div>
                      <div className="uifa-note-meta">Priority: {entry.priority}</div>
                    </div>
                    <button
                      className="uifa-link-btn"
                      type="button"
                      onClick={() => setEntries((value) => value.filter((item) => item.id !== entry.id))}
                    >
                      remove
                    </button>
                  </div>
                </article>
              ))
            )}

            <div className="uifa-divider" />
            <div className="uifa-row">
              <div className="uifa-title">Export Prompt</div>
              <button className="uifa-secondary-btn active" onClick={copyPrompt} type="button" disabled={entries.length === 0}>
                {copyState === "idle" ? "Copy Prompt" : copyState === "copied" ? "Copied" : "Copy Failed"}
              </button>
            </div>
            <textarea className="uifa-textarea" readOnly value={prompt} />
          </div>
        </section>
      ) : null}
    </div>
  );

  return createPortal(root, document.body);
}
