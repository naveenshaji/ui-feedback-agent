const TEST_ATTRS = ["data-testid", "data-test", "data-cy", "name"];

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

function getPreferredSelector(element: Element): string | null {
  const htmlElement = element as HTMLElement;

  if (htmlElement.id) {
    return `#${cssEscape(htmlElement.id)}`;
  }

  for (const attr of TEST_ATTRS) {
    const value = htmlElement.getAttribute(attr);
    if (value) {
      return `[${attr}="${cssEscape(value)}"]`;
    }
  }

  return null;
}

function buildPathSelector(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && parts.length < 5) {
    const preferred = getPreferredSelector(current);
    if (preferred) {
      parts.unshift(preferred);
      break;
    }

    const tagName = current.tagName.toLowerCase();
    const className = (current as HTMLElement).className;
    const classes = typeof className === "string"
      ? className
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((item) => `.${cssEscape(item)}`)
          .join("")
      : "";

    const parent: Element | null = current.parentElement;
    if (!parent) {
      parts.unshift(`${tagName}${classes}`);
      break;
    }

    const currentTagName = current.tagName;
    const siblings = Array.from(parent.children as HTMLCollectionOf<Element>).filter(
      (child: Element) => child.tagName === currentTagName
    );
    const nth = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : "";

    parts.unshift(`${tagName}${classes}${nth}`);
    current = parent;
  }

  return parts.join(" > ");
}

function getTextSnippet(element: Element, maxTextLength: number): string {
  const htmlElement = element as HTMLElement;
  const candidates: Array<string | null> = [
    htmlElement.innerText,
    htmlElement.textContent,
    htmlElement.getAttribute("aria-label"),
    htmlElement.getAttribute("title"),
    htmlElement.getAttribute("placeholder"),
    htmlElement.getAttribute("alt")
  ];

  for (const value of candidates) {
    if (!value) {
      continue;
    }

    const cleaned = value.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      continue;
    }

    if (cleaned.length <= maxTextLength) {
      return cleaned;
    }

    return `${cleaned.slice(0, maxTextLength)}...`;
  }

  return "(no nearby text content)";
}

export interface ElementContext {
  tagName: string;
  selector: string;
  selectorCandidates: string[];
  textSnippet: string;
}

export function getElementContext(element: Element, maxTextLength: number): ElementContext {
  const selector = getPreferredSelector(element) ?? buildPathSelector(element);
  const selectorCandidates = [selector];

  const pathSelector = buildPathSelector(element);
  if (pathSelector !== selector) {
    selectorCandidates.push(pathSelector);
  }

  for (const attr of TEST_ATTRS) {
    const value = element.getAttribute(attr);
    if (value) {
      selectorCandidates.push(`[${attr}="${value}"]`);
    }
  }

  return {
    tagName: element.tagName.toLowerCase(),
    selector,
    selectorCandidates: Array.from(new Set(selectorCandidates)),
    textSnippet: getTextSnippet(element, maxTextLength)
  };
}
