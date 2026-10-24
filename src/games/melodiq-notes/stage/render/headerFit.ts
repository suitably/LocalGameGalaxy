/** Which font a header text is drawn with; the renderer sets it before measuring. */
export type HeaderRole = 'label' | 'part' | 'score';

export type MeasureText = (text: string, role: HeaderRole) => number;

export interface HeaderInput {
  /** Panel width in px. */
  width: number;
  /** Already translated "Player N"; null when only one player is on stage. */
  player: string | null;
  instrument: string;
  /** Already translated keyboard-focus marker; null when not shown. */
  focusMarker: string | null;
  partName: string;
  /** Right-hand texts from fullest to shortest; the last one is the score alone. */
  rightOptions: readonly string[];
}

export interface HeaderLayout {
  /** Left label (player, instrument, focus marker); drawn at `HEADER_LEFT_X`. */
  label: string;
  /** Part name, or null when dropped. Drawn at `partX`. */
  part: string | null;
  partX: number;
  /** Right-aligned stats text; drawn ending at `rightX`. */
  right: string;
  rightX: number;
}

export const HEADER_LEFT_X = 22;
export const HEADER_RIGHT_PAD = 10;
const GAP = 12;
const PART_GAP = 8;
const SEP = ' · ';
const MAX_PART_CHARS = 28;
const ELLIPSIS = '…';

/** Longest prefix of `text` plus an ellipsis that fits into `max` px; '' if even '…' does not. */
export function ellipsize(text: string, max: number, measure: (s: string) => number): string {
  if (measure(text) <= max) return text;
  for (let n = text.length - 1; n > 0; n--) {
    const s = text.slice(0, n).trimEnd() + ELLIPSIS;
    if (measure(s) <= max) return s;
  }
  return measure(ELLIPSIS) <= max ? ELLIPSIS : '';
}

function labelVariants(i: HeaderInput): string[] {
  const join = (...p: Array<string | null>) => p.filter((s): s is string => !!s).join(SEP);
  if (!i.player) return [i.instrument];
  return [join(i.player, i.instrument, i.focusMarker), join(i.player, i.instrument), i.player];
}

/**
 * Decides what the panel header shows so nothing overlaps. The score always stays; the left
 * side drops the part name, then the focus marker, then the instrument; only then the right
 * side loses accuracy, combo and multiplier; finally the left label is ellipsized.
 */
export function fitHeaderSegments(i: HeaderInput, measure: MeasureText): HeaderLayout {
  const rightX = i.width - HEADER_RIGHT_PAD;
  const variants = labelVariants(i);
  const part =
    i.partName.length > MAX_PART_CHARS ? `${i.partName.slice(0, MAX_PART_CHARS - 1)}…` : i.partName;
  const partW = part ? measure(part, 'part') : 0;
  const labelW = (s: string) => measure(s, 'label');

  for (const right of i.rightOptions) {
    const limit = rightX - measure(right, 'score') - GAP;
    const label = variants.find((v) => HEADER_LEFT_X + labelW(v) <= limit);
    if (label === undefined) continue;
    const partX = HEADER_LEFT_X + labelW(label) + PART_GAP;
    const showPart = label === variants[0] && part !== '' && partX + partW <= limit;
    return { label, part: showPart ? part : null, partX, right, rightX };
  }
  const right = i.rightOptions[i.rightOptions.length - 1] ?? '';
  const room = rightX - measure(right, 'score') - GAP - HEADER_LEFT_X;
  const shortest = variants[variants.length - 1];
  return { label: ellipsize(shortest, room, labelW), part: null, partX: 0, right, rightX };
}
