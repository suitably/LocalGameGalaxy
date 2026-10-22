/**
 * VirtualTabletop widget types we have our own widget for [ID: LOGIC-TABLETOP-VTT-WIDGETS]
 *
 * Label, button, spinner and timer keep their type instead of becoming plain tokens; dice use
 * their `faces`; basic widgets with several `faces` become switchable `states`. Property names
 * follow the VirtualTabletop file format (format only; no code is taken from that project).
 * Routines are not translated yet (open question Q15), so buttons import without one.
 */
import type {
  ButtonWidget,
  DieWidget,
  LabelWidget,
  SpinnerWidget,
  TabletopWidget,
  TimerWidget,
  TokenWidget,
  WidgetStateFace,
} from './types';

export interface VttWidgetPlacement {
  id: string;
  x: number;
  y: number;
  zIndex: number;
  rotation?: number;
  /** Resolves an asset reference (`/assets/…`) to a usable URL. */
  resolveImage: (ref: unknown) => string | undefined;
}

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** `"2:30"`, `"0:05.25"` or milliseconds. */
export function parseVttTime(value: unknown): number {
  if (typeof value === 'number') return Math.max(0, value);
  if (typeof value !== 'string') return 0;
  const match = /^(\d+):(\d+(?:\.\d+)?)$/.exec(value.trim());
  if (!match) return Number(value) || 0;
  return Math.round((Number(match[1]) * 60 + Number(match[2])) * 1000);
}

const box = (
  raw: Record<string, unknown>,
  p: VttWidgetPlacement,
  width: number,
  height: number,
) => ({
  id: p.id,
  x: p.x,
  y: p.y,
  width: num(raw.width, width),
  height: num(raw.height, height),
  zIndex: p.zIndex,
  rotation: p.rotation,
});

/** Our widget for a VTT `label`, `button`, `spinner`, `timer` or `dice`; `null` for other types. */
export function normalizeVttTypedWidget(
  rawType: string,
  raw: Record<string, unknown>,
  p: VttWidgetPlacement,
): TabletopWidget | null {
  switch (rawType) {
    case 'label':
      return {
        ...box(raw, p, 100, 20),
        type: 'label',
        text: String(raw.text ?? ''),
      } as LabelWidget;
    case 'button':
      return {
        ...box(raw, p, 80, 80),
        type: 'button',
        text: String(raw.text ?? ''),
        color: typeof raw.backgroundColor === 'string' ? raw.backgroundColor : undefined,
        image: p.resolveImage(raw.image),
        routine: [],
      } as ButtonWidget;
    case 'spinner': {
      const options = (Array.isArray(raw.options) ? raw.options : [1, 2, 3, 4, 5, 6]).map(String);
      const valueIndex = options.indexOf(String(raw.value));
      return {
        ...box(raw, p, 110, 110),
        type: 'spinner',
        options,
        angle: num(raw.angle, 0),
        value: valueIndex >= 0 ? valueIndex : undefined,
      } as SpinnerWidget;
    }
    case 'timer': {
      const shown = parseVttTime(raw.milliseconds);
      // A countdown runs from `start` (reset value) down; a stopwatch counts `milliseconds` up.
      const durationMs = raw.countdown === true ? parseVttTime(raw.start) || shown : 0;
      return {
        ...box(raw, p, 150, 40),
        type: 'timer',
        durationMs,
        elapsedMs: durationMs > 0 ? Math.max(0, durationMs - shown) : shown,
      } as TimerWidget;
    }
    case 'dice':
    case 'die': {
      const faces = Array.isArray(raw.faces) ? raw.faces : [1, 2, 3, 4, 5, 6];
      const active = Math.min(Math.max(0, num(raw.activeFace, 0)), faces.length - 1);
      const face = faces[active];
      const value = typeof face === 'number' ? face : Number(face);
      return {
        ...box(raw, p, 50, 50),
        type: 'die',
        sides: faces.length,
        currentValue: Number.isFinite(value) ? value : active + 1,
        color: typeof raw.color === 'string' ? raw.color : '#ffffff',
        pipColor: typeof raw.pipColor === 'string' ? raw.pipColor : '#000000',
        movable: raw.movable === true,
        pinned: raw.movable !== true,
      } as DieWidget;
    }
    default:
      return null;
  }
}

/**
 * The looks of a basic widget with several `faces` (each face overrides some properties), or
 * `undefined` when it has fewer than two. Index = `activeFace`.
 */
export function vttFacesToStates(
  raw: Record<string, unknown>,
  resolveImage: (ref: unknown) => string | undefined,
): Pick<TokenWidget, 'states' | 'stateIndex'> | undefined {
  if (!Array.isArray(raw.faces) || raw.faces.length < 2) return undefined;
  const states: WidgetStateFace[] = raw.faces.map((face) => {
    const f = face && typeof face === 'object' ? (face as Record<string, unknown>) : {};
    return {
      label:
        typeof f.text === 'string' ? f.text : typeof raw.text === 'string' ? raw.text : undefined,
      image: resolveImage(f.image ?? raw.image),
      color: typeof f.color === 'string' ? f.color : undefined,
      width: typeof f.width === 'number' ? f.width : undefined,
      height: typeof f.height === 'number' ? f.height : undefined,
    };
  });
  return { states, stateIndex: Math.min(Math.max(0, num(raw.activeFace, 0)), states.length - 1) };
}
