import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
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

const ACCENT_HEXES = ["#00d2ff", "#10b981", "#f97316", "#facc15", "#ef4444", "#22d3ee"];

const OVERLAY_STYLES = `
.uifa-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483000;
  font-family: "Inter", "Inter var", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #f5f5f5;
}
.uifa-launcher, .uifa-panel, .uifa-mode-chip, .uifa-highlight, .uifa-composer, .uifa-marker { pointer-events: auto; }
body.uifa-mode-on { cursor: crosshair; }
.uifa-mode-wash {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 70% 16%, rgba(var(--uifa-accent-rgb), 0.08), transparent 38%);
}
.uifa-mode-chip {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(8, 8, 10, 0.88);
  color: #f7f7f7;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.46);
}
.uifa-highlight {
  position: fixed;
  border: 2px solid var(--uifa-accent);
  background: rgba(var(--uifa-accent-rgb), 0.14);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.62) inset;
  pointer-events: none;
}
.uifa-launcher {
  position: fixed;
  right: 20px;
  bottom: 20px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(10, 10, 12, 0.96);
  color: #f5f5f5;
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 16px 30px rgba(0,0,0,0.42);
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}
.uifa-launcher:hover {
  transform: translateY(-1px);
  border-color: rgba(255,255,255,0.34);
  background: rgba(16, 16, 18, 0.98);
}
.uifa-launcher-active {
  border-color: rgba(var(--uifa-accent-rgb), 0.84);
  box-shadow: 0 0 0 1px rgba(var(--uifa-accent-rgb), 0.38), 0 16px 30px rgba(0,0,0,0.42);
}
.uifa-panel {
  position: fixed;
  right: 20px;
  top: 20px;
  width: min(410px, calc(100vw - 40px));
  max-height: calc(100vh - 40px);
  overflow: auto;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(10, 10, 12, 0.97);
  border-radius: 14px;
  box-shadow: 0 30px 52px rgba(0,0,0,0.56);
  backdrop-filter: blur(6px);
}
.uifa-panel-inner { padding: 14px; display: grid; gap: 12px; }
.uifa-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.uifa-title { font-size: 13px; font-weight: 650; letter-spacing: 0.01em; color: #fafafa; }
.uifa-sub {
  font-size: 11px;
  color: #adadb2;
  line-height: 1.45;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.uifa-controls { display: flex; gap: 8px; flex-wrap: wrap; }
.uifa-divider { height: 1px; background: rgba(255,255,255,0.11); margin: 2px 0; }
.uifa-btn {
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.03);
  color: #efefef;
  border-radius: 9px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 520;
  cursor: pointer;
  transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
}
.uifa-btn:hover { transform: translateY(-1px); background: rgba(255,255,255,0.06); }
.uifa-btn:active { transform: translateY(0); }
.uifa-btn-primary {
  border-color: rgba(var(--uifa-accent-rgb), 0.72);
  color: #fafafa;
  background: rgba(var(--uifa-accent-rgb), 0.18);
}
.uifa-btn-primary:hover { background: rgba(var(--uifa-accent-rgb), 0.24); }
.uifa-note {
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 8px;
  background: rgba(255,255,255,0.015);
}
.uifa-note-title { font-size: 12px; font-weight: 600; color: #f7f7f8; line-height: 1.35; }
.uifa-note-meta {
  font-size: 11px;
  color: #a5a5ab;
  line-height: 1.4;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.uifa-note-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.uifa-note-actions { display: flex; gap: 8px; }
.uifa-link-btn {
  border: none;
  background: transparent;
  color: rgba(var(--uifa-accent-rgb), 0.92);
  cursor: pointer;
  padding: 0;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.uifa-export {
  width: 100%;
  box-sizing: border-box;
  min-height: 130px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(7, 7, 8, 0.92);
  color: #f2f2f3;
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 11px;
  line-height: 1.45;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.uifa-composer {
  position: fixed;
  width: min(328px, calc(100vw - 24px));
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(10, 10, 12, 0.98);
  border-radius: 12px;
  box-shadow: 0 18px 36px rgba(0,0,0,0.5);
  backdrop-filter: blur(6px);
}
.uifa-composer-inner { padding: 10px; display: grid; gap: 8px; }
.uifa-composer-meta {
  font-size: 10px;
  color: #b4b4bb;
  line-height: 1.4;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.uifa-composer-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(6, 6, 7, 0.94);
  color: #f7f7f8;
  border-radius: 8px;
  padding: 8px 9px;
  font-size: 12px;
  line-height: 1.45;
  min-height: 72px;
  resize: vertical;
}
.uifa-composer-input:focus {
  outline: none;
  border-color: rgba(var(--uifa-accent-rgb), 0.7);
  box-shadow: 0 0 0 1px rgba(var(--uifa-accent-rgb), 0.24);
}
.uifa-composer-actions { display: flex; gap: 8px; justify-content: flex-end; }
.uifa-marker {
  position: fixed;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,0.62);
  color: #f4f4f5;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.45), 0 6px 18px rgba(0,0,0,0.46);
  transition: transform 140ms ease;
}
.uifa-marker:hover { transform: scale(1.08); }
`;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface AccentToken {
  hex: string;
  rgb: string;
  textColor: string;
}

interface ComposerState {
  rect: Rect;
  tagName: string;
  selector: string;
  selectorCandidates: string[];
  textSnippet: string;
  accent: AccentToken;
}

interface HoverLayerState {
  index: number;
  total: number;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgba(hex: string): RGBA {
  const normalized = hex.replace("#", "").trim();
  const value = normalized.length === 3
    ? normalized.split("").map((chunk) => `${chunk}${chunk}`).join("")
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    return { r: 0, g: 210, b: 255, a: 1 };
  }

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
    a: 1
  };
}

function parseCssColor(raw: string | null | undefined): RGBA | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith("#")) {
    return hexToRgba(trimmed);
  }

  const match = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) {
    return null;
  }

  const parts = match[1].split(",").map((part) => part.trim());
  if (parts.length < 3) {
    return null;
  }

  const r = clampChannel(Number.parseFloat(parts[0]));
  const g = clampChannel(Number.parseFloat(parts[1]));
  const b = clampChannel(Number.parseFloat(parts[2]));
  const alpha = parts.length >= 4 ? Number.parseFloat(parts[3]) : 1;

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b) || Number.isNaN(alpha)) {
    return null;
  }

  return {
    r,
    g,
    b,
    a: Math.max(0, Math.min(1, alpha))
  };
}

function relativeLuminance(color: RGBA): number {
  const convert = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };

  const r = convert(color.r);
  const g = convert(color.g);
  const b = convert(color.b);

  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function contrastRatio(a: RGBA, b: RGBA): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function getEffectiveBackgroundColor(element: Element): RGBA {
  let current: HTMLElement | null = element as HTMLElement;

  while (current) {
    const background = parseCssColor(window.getComputedStyle(current).backgroundColor);
    if (background && background.a > 0.06) {
      return background;
    }

    current = current.parentElement;
  }

  return { r: 18, g: 18, b: 20, a: 1 };
}

function toAccentToken(hex: string): AccentToken {
  const rgb = hexToRgba(hex);
  const white = { r: 245, g: 245, b: 247, a: 1 };
  const black = { r: 10, g: 10, b: 12, a: 1 };
  const textColor = contrastRatio(rgb, white) >= contrastRatio(rgb, black) ? "#f5f5f7" : "#0a0a0c";

  return {
    hex,
    rgb: `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    textColor
  };
}

function selectAccentForElement(element: Element): AccentToken {
  const background = getEffectiveBackgroundColor(element);

  let bestAccent = ACCENT_HEXES[0];
  let bestScore = -1;

  for (const hex of ACCENT_HEXES) {
    const score = contrastRatio(hexToRgba(hex), background);
    if (score > bestScore) {
      bestScore = score;
      bestAccent = hex;
    }
  }

  return toAccentToken(bestAccent);
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

function isInteractiveElement(element: Element): boolean {
  return element.matches(
    "a, button, input, select, textarea, summary, label, [role=\"button\"], [role=\"link\"], [contenteditable=\"true\"]"
  );
}

function hasSemanticTargetHints(element: Element): boolean {
  if (element.id) {
    return true;
  }

  const attrs = ["data-testid", "data-test", "data-cy", "name", "role", "aria-label"];
  return attrs.some((attr) => element.hasAttribute(attr));
}

function rectNearlyEqual(a: DOMRect, b: DOMRect): boolean {
  return (
    Math.abs(a.top - b.top) <= 1 &&
    Math.abs(a.left - b.left) <= 1 &&
    Math.abs(a.width - b.width) <= 1 &&
    Math.abs(a.height - b.height) <= 1
  );
}

function getPickableElementsAtPoint(x: number, y: number): Element[] {
  const elements = document.elementsFromPoint(x, y);
  const seen = new Set<Element>();
  const rawCandidates = elements.filter((element) => {
    if (seen.has(element)) {
      return false;
    }
    seen.add(element);

    if (element.closest(`[${ROOT_ATTR}]`)) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width >= 1 && rect.height >= 1;
  });

  if (rawCandidates.length <= 1) {
    return rawCandidates;
  }

  const filtered: Element[] = [];
  let previousRect: DOMRect | null = null;
  const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);

  for (const element of rawCandidates) {
    const tag = element.tagName.toLowerCase();
    if ((tag === "html" || tag === "body") && rawCandidates.length > 1) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    const isLargeLayer = area >= viewportArea * 0.9;
    const semantic = isInteractiveElement(element) || hasSemanticTargetHints(element);
    const duplicateWrapper = previousRect && rectNearlyEqual(rect, previousRect) && !semantic;

    if ((isLargeLayer && !semantic) || duplicateWrapper) {
      continue;
    }

    filtered.push(element);
    previousRect = rect;
  }

  return filtered.length > 0 ? filtered : rawCandidates;
}

function isSamePointerPoint(
  a: { x: number; y: number } | null,
  b: { x: number; y: number },
  maxDistanceSquared = 36
): boolean {
  if (!a) {
    return false;
  }

  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return (dx * dx) + (dy * dy) <= maxDistanceSquared;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

function getSteppedLayerIndex(candidates: Element[], currentIndex: number, direction: -1 | 1): number {
  if (candidates.length <= 1) {
    return currentIndex;
  }

  const currentElement = candidates[currentIndex];
  let index = currentIndex;

  for (let attempts = 0; attempts < candidates.length; attempts += 1) {
    index = (index + direction + candidates.length) % candidates.length;
    const candidate = candidates[index];

    if (direction === 1 && candidate.contains(currentElement)) {
      continue;
    }

    return index;
  }

  return currentIndex;
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
  const width = Math.min(328, window.innerWidth - 24);
  const minInset = 12;
  const gap = 10;

  let left = rect.left + rect.width + gap;
  if (left + width > window.innerWidth - minInset) {
    left = rect.left - width - gap;
  }
  if (left < minInset) {
    left = clamp(rect.left, minInset, Math.max(minInset, window.innerWidth - width - minInset));
  }

  const top = clamp(rect.top, minInset, Math.max(minInset, window.innerHeight - 176));

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
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entries, setEntries] = useState<UIFeedbackEntry[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [markerRects, setMarkerRects] = useState<Record<string, Rect>>({});
  const [activeAccent, setActiveAccent] = useState<AccentToken>(() => toAccentToken(ACCENT_HEXES[0]));
  const [hoverLayer, setHoverLayer] = useState<HoverLayerState>({ index: 0, total: 0 });

  const hoverPointRef = useRef<{ x: number; y: number } | null>(null);
  const hoverLayerIndexRef = useRef(0);
  const singleClickTimerRef = useRef<number | null>(null);

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
      if (!matchHotkey(event, hotkey) && isEditableTarget(event.target)) {
        return;
      }

      if (matchHotkey(event, hotkey)) {
        event.preventDefault();
        setFeedbackMode((value) => !value);
        setPanelOpen(false);
        setComposer(null);
        setDraftComment("");
        setEditingEntryId(null);
        return;
      }

      if (event.key === "Escape") {
        if (composer) {
          setComposer(null);
          setDraftComment("");
          setEditingEntryId(null);
          return;
        }

        setHoverRect(null);
        setFeedbackMode(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [composer, enabled, hotkey, mounted]);

  useEffect(() => {
    if (!enabled || !feedbackMode) {
      setHoverRect(null);
      setHoverLayer({ index: 0, total: 0 });
      hoverPointRef.current = null;
      hoverLayerIndexRef.current = 0;
      if (singleClickTimerRef.current !== null) {
        window.clearTimeout(singleClickTimerRef.current);
        singleClickTimerRef.current = null;
      }
      return;
    }

    const applySelectionAtPoint = (
      x: number,
      y: number,
      mode: "default" | "deeper" | "shallower"
    ) => {
      const candidates = getPickableElementsAtPoint(x, y);
      if (candidates.length === 0) {
        setHoverRect(null);
        setHoverLayer({ index: 0, total: 0 });
        return;
      }

      const point = { x, y };
      const samePoint = isSamePointerPoint(hoverPointRef.current, point);
      let index = samePoint ? hoverLayerIndexRef.current : 0;

      if (mode === "deeper") {
        index = samePoint
          ? getSteppedLayerIndex(candidates, index, 1)
          : Math.min(1, candidates.length - 1);
      } else if (mode === "shallower") {
        index = samePoint
          ? getSteppedLayerIndex(candidates, index, -1)
          : 0;
      } else {
        index = Math.min(index, candidates.length - 1);
      }

      hoverPointRef.current = point;
      hoverLayerIndexRef.current = index;
      setHoverLayer({ index, total: candidates.length });

      const selected = candidates[index];
      const accent = selectAccentForElement(selected);
      setActiveAccent(accent);

      const context = getElementContext(selected, maxTextLength);
      const rect = selected.getBoundingClientRect();
      const resolvedRect: Rect = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      };

      setComposer({
        rect: resolvedRect,
        accent,
        ...context
      });
      setDraftComment("");
      setEditingEntryId(null);
      setHoverRect(resolvedRect);
    };

    const onLayerKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "]" && event.key !== "[") {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }

      const center = hoverRect
        ? {
            x: hoverRect.left + (hoverRect.width / 2),
            y: hoverRect.top + (hoverRect.height / 2)
          }
        : null;
      const point = hoverPointRef.current ?? center;
      if (!point) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      applySelectionAtPoint(
        point.x,
        point.y,
        event.key === "]" ? "deeper" : "shallower"
      );
    };

    const onMouseMove = (event: MouseEvent) => {
      const candidates = getPickableElementsAtPoint(event.clientX, event.clientY);
      if (candidates.length === 0) {
        setHoverRect(null);
        setHoverLayer({ index: 0, total: 0 });
        hoverPointRef.current = null;
        hoverLayerIndexRef.current = 0;
        return;
      }

      const point = { x: event.clientX, y: event.clientY };
      const moved = !isSamePointerPoint(hoverPointRef.current, point, 20);
      if (moved) {
        hoverLayerIndexRef.current = 0;
      }

      const index = Math.min(hoverLayerIndexRef.current, candidates.length - 1);
      const element = candidates[index];
      hoverPointRef.current = point;
      setHoverLayer({ index, total: candidates.length });

      const accent = selectAccentForElement(element);
      setActiveAccent((current) => (current.hex === accent.hex ? current : accent));

      const rect = element.getBoundingClientRect();
      setHoverRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    };

    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.detail >= 2) {
        if (singleClickTimerRef.current !== null) {
          window.clearTimeout(singleClickTimerRef.current);
          singleClickTimerRef.current = null;
        }
        applySelectionAtPoint(event.clientX, event.clientY, "deeper");
        return;
      }

      if (singleClickTimerRef.current !== null) {
        window.clearTimeout(singleClickTimerRef.current);
      }

      singleClickTimerRef.current = window.setTimeout(() => {
        applySelectionAtPoint(event.clientX, event.clientY, "default");
        singleClickTimerRef.current = null;
      }, 210);
    };

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onLayerKeyDown, true);

    return () => {
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onLayerKeyDown, true);
      if (singleClickTimerRef.current !== null) {
        window.clearTimeout(singleClickTimerRef.current);
        singleClickTimerRef.current = null;
      }
    };
  }, [enabled, feedbackMode, hoverRect, maxTextLength]);

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

  const openComposerForEntry = (entry: UIFeedbackEntry) => {
    const markerRect = markerRects[entry.id];
    const element = resolveElement(entry);
    const elementRect = element?.getBoundingClientRect();

    const fallbackRect: Rect | null = markerRect
      ? markerRect
      : elementRect
        ? {
            top: elementRect.top,
            left: elementRect.left,
            width: elementRect.width,
            height: elementRect.height
          }
        : null;

    if (!fallbackRect) {
      setPanelOpen(true);
      return;
    }

    const accent = entry.accentColor
      ? toAccentToken(entry.accentColor)
      : element
        ? selectAccentForElement(element)
        : activeAccent;

    setActiveAccent(accent);
    setFeedbackMode(true);
    setPanelOpen(false);
    setHoverRect(fallbackRect);
    setHoverLayer({ index: 0, total: 1 });
    hoverLayerIndexRef.current = 0;
    hoverPointRef.current = {
      x: fallbackRect.left + (fallbackRect.width / 2),
      y: fallbackRect.top + (fallbackRect.height / 2)
    };
    setEditingEntryId(entry.id);
    setDraftComment(entry.requestedChange);
    setComposer({
      rect: fallbackRect,
      accent,
      tagName: entry.tagName,
      selector: entry.selector,
      selectorCandidates: entry.selectorCandidates,
      textSnippet: entry.textSnippet
    });
  };

  const saveComment = () => {
    const comment = draftComment.trim();
    if (!composer || !comment) {
      return;
    }

    if (editingEntryId) {
      setEntries((value) =>
        value.map((entry) =>
          entry.id === editingEntryId
            ? {
                ...entry,
                requestedChange: comment,
                accentColor: composer.accent.hex,
                accentTextColor: composer.accent.textColor
              }
            : entry
        )
      );
    } else {
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
        createdAt: new Date().toISOString(),
        accentColor: composer.accent.hex,
        accentTextColor: composer.accent.textColor
      };

      setEntries((value) => [entry, ...value]);
    }

    setComposer(null);
    setDraftComment("");
    setEditingEntryId(null);
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

  const rootStyle = {
    "--uifa-accent": activeAccent.hex,
    "--uifa-accent-rgb": activeAccent.rgb
  } as CSSProperties;

  const root = (
    <div className="uifa-root" style={rootStyle} {...{ [ROOT_ATTR]: "true" }}>
      {feedbackMode ? <div className="uifa-mode-wash" /> : null}
      {feedbackMode ? (
        <div className="uifa-mode-chip">
          feedback mode active · click element · {hotkeyLabel}
          {hoverLayer.total > 1 ? ` · layer ${hoverLayer.index + 1}/${hoverLayer.total} · double-click or ]/[` : ""}
        </div>
      ) : null}

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

        const markerAccent = entry.accentColor ?? activeAccent.hex;
        const markerText = entry.accentTextColor ?? "#f5f5f7";

        return (
          <button
            key={entry.id}
            className="uifa-marker"
            type="button"
            title={entry.requestedChange}
            onClick={() => openComposerForEntry(entry)}
            style={{
              top: `${markerRect.top - 9}px`,
              left: `${markerRect.left + markerRect.width - 9}px`,
              backgroundColor: markerAccent,
              color: markerText
            }}
          >
            {index + 1}
          </button>
        );
      })}

      {composer && composerPosition ? (
        <form
          className="uifa-composer"
          style={{
            top: `${composerPosition.top}px`,
            left: `${composerPosition.left}px`,
            borderColor: "rgba(var(--uifa-accent-rgb), 0.58)"
          }}
          onSubmit={(event) => {
            event.preventDefault();
            saveComment();
          }}
        >
          <div className="uifa-composer-inner">
            <div className="uifa-composer-meta">{composer.selector}</div>
            <div className="uifa-composer-meta">text: {composer.textSnippet}</div>
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
              <button
                className="uifa-btn"
                type="button"
                onClick={() => {
                  setComposer(null);
                  setDraftComment("");
                  setEditingEntryId(null);
                }}
              >
                Cancel
              </button>
              <button className="uifa-btn uifa-btn-primary" type="submit" disabled={!draftComment.trim()}>
                {editingEntryId ? "Update (Enter)" : "Save (Enter)"}
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
                <div className="uifa-sub">toggle mode: {hotkeyLabel}</div>
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
                  setDraftComment("");
                  setEditingEntryId(null);
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
                      <div className="uifa-note-meta">route: {entry.route}</div>
                    </div>
                    <div className="uifa-note-actions">
                      <button className="uifa-link-btn" type="button" onClick={() => openComposerForEntry(entry)}>
                        edit
                      </button>
                      <button
                        className="uifa-link-btn"
                        type="button"
                        onClick={() => setEntries((value) => value.filter((item) => item.id !== entry.id))}
                      >
                        remove
                      </button>
                    </div>
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
