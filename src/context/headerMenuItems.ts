import { isValidElement, type ReactNode } from 'react';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  action: () => void;
  disabled?: boolean;
  showAlways?: boolean;
}

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

const isPrimitive = (value: unknown): value is Primitive =>
  value === null || (typeof value !== 'object' && typeof value !== 'function');

/**
 * Icons are usually fresh JSX elements on every render, so identity is useless. Two icons
 * count as equal when they are the same element type and key and agree on every primitive
 * prop (e.g. `color`, `fontSize`). Object and function props (`sx`, `children`, a status
 * object) are ignored on purpose: callers rebuild them every render, and comparing them
 * would turn a fresh-array-per-render caller into a render loop.
 */
const isSameIcon = (a: ReactNode, b: ReactNode): boolean => {
  if (a === b) return true;
  if (!isValidElement(a) || !isValidElement(b)) return false;
  if (a.type !== b.type || a.key !== b.key) return false;
  const pa = a.props as Record<string, unknown>;
  const pb = b.props as Record<string, unknown>;
  const keys = new Set([...Object.keys(pa), ...Object.keys(pb)]);
  for (const key of keys) {
    const va = pa[key];
    const vb = pb[key];
    if ((isPrimitive(va) || isPrimitive(vb)) && va !== vb) return false;
  }
  return true;
};

/** Everything the header renders for the items: label, icon, disabled and placement. */
const isSameMenuView = (prev: MenuItem[], next: MenuItem[]): boolean =>
  prev.length === next.length &&
  prev.every((item, i) => {
    const other = next[i];
    return (
      other !== undefined &&
      item.label === other.label &&
      item.disabled === other.disabled &&
      item.showAlways === other.showAlways &&
      isSameIcon(item.icon, other.icon)
    );
  });

/**
 * State updater for `setMenuItems`.
 *
 * Why the comparison: many callers build a fresh array (fresh icons, inline arrows) in an
 * effect that runs on every render or whose deps change often. Storing every new array would
 * re-render the provider, and with it the caller, which sets a fresh array again: a render
 * loop ("Maximum update depth exceeded"). So the state only changes when what the header
 * shows changes.
 *
 * Why the ref: the old version kept the previous array whenever the view matched, so its
 * stale `action` closures stayed wired to the buttons. Now `latest` always holds the newest
 * array, and the rendered items carry stable wrappers that call `latest.current[i].action()`
 * at click time. Actions therefore never go stale, and comparing them (which would loop for
 * every caller that passes inline arrows) is not needed. Callers need not memoise actions or
 * route them through their own refs.
 */
export const commitMenuItems = (
  latest: { current: MenuItem[] },
  next: MenuItem[],
): ((prev: MenuItem[]) => MenuItem[]) => {
  // Eagerly, not inside the updater: a click before the next render already sees `next`.
  latest.current = next;
  return (prev) =>
    isSameMenuView(prev, next)
      ? prev
      : next.map((item, i) => ({
          ...item,
          action: () => latest.current[i]?.action(),
        }));
};
