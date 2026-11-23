/** Shared per-widget context for the PlayingCards.io normalizer [ID: GAME-TABLETOP-NORMALIZER] */
import type { TabletopWidget } from '../types';

export interface PcioWidgetContext {
  id: string;
  raw: Record<string, unknown>;
  rawType: string;
  rawWidgets: Record<string, Record<string, unknown>>;
  assetFiles?: Record<string, string>;
  globalPos: { x: number; y: number };
  rotation: number;
  label: string | undefined;
  rawImage: string | undefined;
  resolvedImage: string | null | undefined;
  resolveImage: (ref: unknown) => string | undefined;
  normalized: Record<string, TabletopWidget>;
  pileCardMap: Map<string, string[]>;
  holderHasPileChild: Set<string>;
}
