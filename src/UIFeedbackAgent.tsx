import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import type { UIFeedbackAgentProps, UIFeedbackEntry, UIFeedbackHotkey } from "./types";
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
.uifa-launcher, .uifa-panel, .uifa-mode-chip, .uifa-highlight, .uifa-composer, .uifa-marker { pointer-events: auto; }
body.uifa-mode-on { cursor: crosshair; }
.uifa-launcher { position: fixed; right: 20px; bottom: 20px; border: 1px solid rgba(255,255,255,0.24); background: rgba(16, 20, 28, 0.96); color: #fff; border-radius: 999px; padding: 10px 14px; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 10px 28px rgba(0,0,0,0.35); }
.uifa-launcher:hover { background: rgba(24, 30, 44, 0.98); }
.uifa-launcher-active { border-color: rgba(113, 190, 255, 0.8); box-shadow: 0 0 0 2px rgba(82, 169, 255, 0.2), 0 10px 28px rgba(0,0,0,0.35); }
.uifa-mode-wash { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(circle at 70% 20%, rgba(94, 172, 255, 0.12), transparent 45%); }
.uifa-mode-chip { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); border: 1px solid rgba(167, 209, 255, 0.65); background: rgba(61, 133, 225, 0.78); color: #f5faff; border-radius: 999px; padding: 6px 11px; font-size: 11px; letter-spacing: 0.02em; box-shadow: 0 10px 26px rgba(8, 28, 67, 0.35); }
.uifa-highlight { position: fixed; border: 2px solid rgba(73, 160, 255, 0.95); background: rgba(73, 160, 255, 0.16); box-shadow: 0 0 0 1px rgba(255,255,255,0.58) inset; pointer-events: none; }
.uifa-composer { position: fixed; width: min(320px, calc(100vw - 24px)); border: 1px solid rgba(255,255,255,0.2); background: rgba(10, 15, 24, 0.97); border-radius: 12px; box-shadow: 0 16px 34px rgba(0,0,0,0.45); backdrop-filter: blur(6px); }
.uifa-composer-inner { padding: 10px; display: grid; gap: 8px; }
.uifa-composer-meta { font-size: 11px; color: #aebbd1; line-height: 1.4; }
.uifa-composer-input { width: 100%; box-sizing: border-box; border: 1px solid rgba(255,255,255,0.2); background: rgba(6, 9, 14, 0.92); color: #f7faff; border-radius: 8px; padding: 8px 9px; font-size: 12px; min-height: 70px; resize: vertical; }
.uifa-composer-actions { display: flex; gap: 8px; justify-content: flex-end; }
.uifa-btn { border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.05); color: #ecf0f8; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
.uifa-btn:hover { background: rgba(255,255,255,0.1); }
.uifa-btn-primary { border-color: rgba(88, 169, 255, 0.8); color: #d9eeff; background: rgba(71, 139, 233, 0.22); }
.uifa-marker { position: fixed; width: 18px; height: 18px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.7); background: rgba(49, 134, 229, 0.96); color: white; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(4, 28, 55, 0.45); }
.uifa-panel { position: fixed; right: 20px; top: 20px; width: min(410px, calc(100vw - 40px)); max-height: calc(100vh - 40px); overflow: auto; border: 1px solid rgba(255,255,255,0.18); background: rgba(11, 15, 24, 0.97); border-radius: 14px; box-shadow: 0 24px 48px rgba(0,0,0,0.5); backdrop-filter: blur(8px); }
.uifa-panel-inner { padding: 14px; display: grid; gap: 12px; }
.uifa-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.uifa-title { font-size: 14px; font-weight: 700; letter-spacing: 0.02em; }
.uifa-sub { font-size: 11px; color: #aeb9cb; line-height: 1.4; }
.uifa-controls { display: flex; gap: 8px; flex-wrap: wrap; }
.uifa-note { border: 1px solid rgba(255,255,255,0.14); border-radius: 10px; padding: 10px; display: grid; gap: 8px; background: rgba(255,255,255,0.02); }
.uifa-note-title { font-size: 12px; font-weight: 600; color: #e8eefb; line-height: 1.35; }
.uifa-note-meta { font-size: 11px; color: #98a6bc; line-height: 1.35; }
.uifa-note-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.uifa-link-btn { border: none; background: transparent; color: #86c5ff; cursor: pointer; padding: 0; font-size: 11px; }
.uifa-divider { height: 1px; background: rgba(255,255,255,0.11); margin: 2px 0; }
.uifa-export { width: 100%; box-sizing: border-box; min-height: 130px; border: 1px solid rgba(255,255,255,0.2); background: rgba(7, 10, 16, 0.92); color: #f7faff; border-radius: 8px; padding: 8px 9px; font-size: 12px; }
`;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ComposerState {
  rect: Rect;
  tagName: string;
  selector: string;
  selectorCandidates: string[];
  textSnippet: string;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getComposerPosition(rect: Rect): { top: number; left: number } {
  const width = Math.min(320, window.innerWidth - 24);
  const minInset = 12;
  const gap = 10;

  let left = rect.left + rect.width + gap;
  if (left + width > window.innerWidth - minInset) {
    left = rect.left - width - gap;
  }
  if (left < minInset) {
    left = clamp(rect.left, minInset, Math.max(minInset, window.innerWidth - width - minInset));
  }

  const top = clamp(rect.top, minInset, Math.max(minInset, window.innerHeight - 170));

  return { top, left };
}

function resolveElement(entry: UIFeedbackEntry): Element | null {
  const selectors = [entry.selector, ...entry.selectorCandidates];

  for (const selector of selectors) {
    if (!selector) {
      continue;
    }

    try {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function buildHotkeyLabel(hotkey: UIFeedbackHotkey): string {
  const keys: string[] = [];

  if (hotkey.metaOrCtrl) {
    keys.push("Cmd/Ctrl");
  } else {
    if (hotkey.metaKey) {
      keys.push("Cmd");
    }
    if (hotkey.ctrlKey) {
      keys.push("Ctrl");
    }
  }

  if (hotkey.shiftKey) {
    keys.push("Shift");
  }
  if (hotkey.altKey) {
    keys.push("Alt");
  }

  keys.push(hotkey.key.toUpperCase());
  return keys.join(" + ");
}

export function UIFeedbackAgent(props: UIFeedbackAgentProps): ReactElement | null {
  const enabled = props.enabled ?? isDevByDefault();
  const hotkey = props.hotkey ?? DEFAULT_HOTKEY;
  const maxTextLength = props.maxTextLength ?? 220;

  const [mounted, setMounted] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hoverRect, setHoverRect] = useState<Rect | null>(null);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [entries, setEntries] = useState<UIFeedbackEntry[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [markerRects, setMarkerRects] = useState<Record<string, Rect>>({});

  const pageUrl = mounted ? window.location.href : "";

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
    if (!mounted) {
      return;
    }

    if (feedbackMode) {
      document.body.classList.add("uifa-mode-on");
    } else {
      document.body.classList.remove("uifa-mode-on");
    }

    return () => {
      document.body.classList.remove("uifa-mode-on");
    };
  }, [feedbackMode, mounted]);

  useEffect(() => {
    if (!enabled || !mounted) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (matchHotkey(event, hotkey)) {
        event.preventDefault();
        setFeedbackMode((value) => !value);
        setPanelOpen(false);
        setComposer(null);
        return;
      }

      if (event.key === "Escape") {
        setComposer(null);
        setHoverRect(null);
        setFeedbackMode(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, hotkey, mounted]);

  useEffect(() => {
    if (!enabled || !feedbackMode) {
      setHoverRect(null);
      return;
    }

    const onMouseMove = (event: MouseEvent) => {
      const element = elementFromEvent(event);
      if (!element) {
        setHoverRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      setHoverRect({
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
      const rect = element.getBoundingClientRect();
      const resolvedRect: Rect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      };

      setComposer({
        rect: resolvedRect,
        ...context
      });
      setDraftComment("");
      setHoverRect(resolvedRect);
    };

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [enabled, feedbackMode, maxTextLength]);

  useEffect(() => {
    if (!enabled || !mounted) {
      return;
    }

    if (entries.length === 0) {
      setMarkerRects({});
      return;
    }

    const update = () => {
      const next: Record<string, Rect> = {};

      for (const entry of entries) {
        const element = resolveElement(entry);
        if (!element) {
          continue;
        }

        const rect = element.getBoundingClientRect();
        next[entry.id] = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        };
      }

      setMarkerRects(next);
    };

    let frame = 0;
    const scheduleUpdate = () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);
    const interval = window.setInterval(update, 900);

    return () => {
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.clearInterval(interval);
      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [enabled, entries, mounted]);

  if (!enabled || !mounted) {
    return null;
  }

  const saveComment = () => {
    const comment = draftComment.trim();
    if (!composer || !comment) {
      return;
    }

    const route = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const entry: UIFeedbackEntry = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      pageUrl: window.location.href,
      route,
      tagName: composer.tagName,
      selector: composer.selector,
      selectorCandidates: composer.selectorCandidates,
      textSnippet: composer.textSnippet,
      observed: composer.textSnippet === "(no nearby text content)"
        ? `Selected ${composer.tagName} element.`
        : `Element text: ${composer.textSnippet}`,
      requestedChange: comment,
      constraints: "",
      priority: "medium",
      createdAt: new Date().toISOString()
    };

    setEntries((value) => [entry, ...value]);
    setComposer(null);
    setDraftComment("");
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

  const composerPosition = composer ? getComposerPosition(composer.rect) : null;
  const hotkeyLabel = buildHotkeyLabel(hotkey);

  const root = (
    <div className="uifa-root" {...{ [ROOT_ATTR]: "true" }}>
      {feedbackMode ? <div className="uifa-mode-wash" /> : null}
      {feedbackMode ? <div className="uifa-mode-chip">Feedback mode active. Click any element.</div> : null}

      {hoverRect && feedbackMode ? (
        <div
          className="uifa-highlight"
          style={{
            top: `${hoverRect.top}px`,
            left: `${hoverRect.left}px`,
            width: `${hoverRect.width}px`,
            height: `${hoverRect.height}px`
          }}
        />
      ) : null}

      {entries.map((entry, index) => {
        const markerRect = markerRects[entry.id];
        if (!markerRect) {
          return null;
        }

        return (
          <button
            key={entry.id}
            className="uifa-marker"
            type="button"
            title={entry.requestedChange}
            onClick={() => setPanelOpen(true)}
            style={{
              top: `${markerRect.top - 9}px`,
              left: `${markerRect.left + markerRect.width - 9}px`
            }}
          >
            {entries.length - index}
          </button>
        );
      })}

      {composer && composerPosition ? (
        <form
          className="uifa-composer"
          style={{ top: `${composerPosition.top}px`, left: `${composerPosition.left}px` }}
          onSubmit={(event) => {
            event.preventDefault();
            saveComment();
          }}
        >
          <div className="uifa-composer-inner">
            <div className="uifa-composer-meta">{composer.selector}</div>
            <div className="uifa-composer-meta">Text: {composer.textSnippet}</div>
            <textarea
              className="uifa-composer-input"
              value={draftComment}
              onChange={(event) => setDraftComment(event.target.value)}
              placeholder="Describe what should change..."
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  saveComment();
                }
              }}
            />
            <div className="uifa-composer-actions">
              <button className="uifa-btn" type="button" onClick={() => setComposer(null)}>
                Cancel
              </button>
              <button className="uifa-btn uifa-btn-primary" type="submit" disabled={!draftComment.trim()}>
                Save (Enter)
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {panelOpen ? (
        <section className="uifa-panel">
          <div className="uifa-panel-inner">
            <div className="uifa-row">
              <div>
                <div className="uifa-title">UI Feedback for Agents</div>
                <div className="uifa-sub">Toggle mode: {hotkeyLabel}</div>
              </div>
              <button className="uifa-btn" onClick={() => setPanelOpen(false)} type="button">
                Close
              </button>
            </div>

            <div className="uifa-controls">
              <button
                className={`uifa-btn ${feedbackMode ? "uifa-btn-primary" : ""}`}
                onClick={() => {
                  setFeedbackMode((value) => !value);
                  setComposer(null);
                }}
                type="button"
              >
                {feedbackMode ? "Stop Feedback Mode" : "Start Feedback Mode"}
              </button>
              <button className="uifa-btn" type="button" onClick={() => setEntries([])}>
                Clear All
              </button>
            </div>

            <div className="uifa-divider" />

            <div className="uifa-row">
              <div className="uifa-title">Staged Comments</div>
              <div className="uifa-sub">{entries.length} total</div>
            </div>

            {entries.length === 0 ? (
              <div className="uifa-sub">No staged comments yet. Turn on feedback mode and click elements.</div>
            ) : (
              entries.map((entry) => (
                <article className="uifa-note" key={entry.id}>
                  <div className="uifa-note-header">
                    <div>
                      <div className="uifa-note-title">{entry.requestedChange}</div>
                      <div className="uifa-note-meta">{entry.selector}</div>
                      <div className="uifa-note-meta">Route: {entry.route}</div>
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
              <button className="uifa-btn uifa-btn-primary" onClick={copyPrompt} type="button" disabled={entries.length === 0}>
                {copyState === "idle" ? "Copy Prompt" : copyState === "copied" ? "Copied" : "Copy Failed"}
              </button>
            </div>
            <textarea className="uifa-export" readOnly value={prompt} />
          </div>
        </section>
      ) : null}

      <button
        className={`uifa-launcher ${feedbackMode ? "uifa-launcher-active" : ""}`}
        onClick={() => setPanelOpen((value) => !value)}
        type="button"
      >
        Feedback {entries.length > 0 ? `(${entries.length})` : ""}
      </button>
    </div>
  );

  return createPortal(root, document.body);
}
