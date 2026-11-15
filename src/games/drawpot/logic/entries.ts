/**
 * Entry list helpers for the draw pot form [ID: DRAWPOT-ENTRIES]
 *
 * One entry per line. `Name *3` (or `x3`, `×3`) puts the same entry into the pot several times —
 * handy for group sizes ("Team Red *4").
 */
export const MAX_ENTRIES = 500;
export const MAX_COPIES = 100;

const COUNT_SUFFIX = /\s*[*x×]\s*(\d{1,3})$/i;

/** Expands the text area into the list sent to the server. */
export function parseEntries(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const match = COUNT_SUFFIX.exec(line);
    const label = match ? line.slice(0, match.index).trim() : line;
    const copies = match ? Math.min(Math.max(Number(match[1]), 1), MAX_COPIES) : 1;
    if (!label) continue;
    for (let i = 0; i < copies; i++) out.push(label);
  }
  return out;
}

/** Labels that occur more than once (case-insensitive), in first-seen spelling. */
export function duplicateLabels(entries: string[]): string[] {
  const seen = new Map<string, number>();
  entries.forEach((e) => seen.set(e.toLowerCase(), (seen.get(e.toLowerCase()) ?? 0) + 1));
  const dupes = new Set<string>();
  entries.forEach((e) => (seen.get(e.toLowerCase()) ?? 0) > 1 && dupes.add(e));
  return [...new Map([...dupes].map((d) => [d.toLowerCase(), d])).values()];
}

/** Text lines for `groupCount` groups of `size` seats each, e.g. `Group 1 *4`. */
export function groupLines(prefix: string, groupCount: number, size: number): string {
  const groups = Math.min(Math.max(Math.floor(groupCount), 1), 50);
  const seats = Math.min(Math.max(Math.floor(size), 1), MAX_COPIES);
  return Array.from({ length: groups }, (_, i) =>
    seats > 1 ? `${prefix} ${i + 1} *${seats}` : `${prefix} ${i + 1}`,
  ).join('\n');
}

/** Groups needed so that `people` fit into groups of at most `size` (balanced sizes). */
export function balancedGroupLines(prefix: string, people: number, size: number): string {
  const count = Math.max(1, Math.ceil(people / Math.max(1, size)));
  const base = Math.floor(people / count);
  const extra = people % count;
  return Array.from({ length: count }, (_, i) => {
    const seats = base + (i < extra ? 1 : 0);
    return seats > 1 ? `${prefix} ${i + 1} *${seats}` : `${prefix} ${i + 1}`;
  }).join('\n');
}
