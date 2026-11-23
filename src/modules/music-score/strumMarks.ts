import { kid, text } from './xmlDom';
import type { StrumDirection } from './types';

/**
 * Strum direction a MusicXML note marks (#634): `<technical><down-bow/>` / `<up-bow/>`, which
 * MuseScore and Guitar Pro export for down and up strokes. `<arpeggiate>` is not read: it marks a
 * rolled chord, and exporters disagree on which arrow means which stroke.
 */
export function xmlStrum(note: Element): StrumDirection | undefined {
  const tech = kid(kid(note, 'notations') ?? note, 'technical');
  if (!tech) return undefined;
  if (kid(tech, 'down-bow')) return 'down';
  if (kid(tech, 'up-bow')) return 'up';
  return undefined;
}

/** Strum direction of a Guitar Pro beat property (`PickStroke` or `Brush`, `<Direction>Up|Down`). */
export function gpStrum(property: Element | null): StrumDirection | undefined {
  const dir = text(property, 'Direction')?.toLowerCase();
  return dir === 'down' || dir === 'up' ? dir : undefined;
}
