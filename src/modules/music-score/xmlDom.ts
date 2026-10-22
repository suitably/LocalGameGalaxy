// Works on browser DOM and on @xmldom (which has no `children`).
export const kids = (el: Element, tag?: string): Element[] => {
  const out: Element[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (!tag || (n as Element).tagName === tag)) out.push(n as Element);
  }
  return out;
};
export const kid = (el: Element, tag: string): Element | null => kids(el, tag)[0] ?? null;
export const text = (el: Element | null, tag: string): string | null => {
  const c = el?.getElementsByTagName(tag)[0];
  return c?.textContent ? c.textContent.trim() : null;
};
export const num = (el: Element | null, tag: string, fallback = 0): number => {
  const v = Number(text(el, tag));
  return Number.isFinite(v) && text(el, tag) !== null ? v : fallback;
};
