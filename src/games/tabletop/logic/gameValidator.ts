/**
 * Tabletop Game Validator & Sanitizer [ID: GAME-TABLETOP-VALIDATOR]
 */
import type { TabletopGameDefinition, TabletopWidget, TabletopPlayMode, TabletopTableConfig } from './types';

export type RawTabletopGameInput = Partial<Omit<TabletopGameDefinition, 'widgets' | 'table' | 'version'>> & {
  version?: string | number;
  widgets?: Record<string, Partial<TabletopWidget> | Record<string, unknown>>;
  table?: Partial<TabletopTableConfig>;
  [key: string]: unknown;
};

export function sanitizeGameSlug(name: string): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || `game-${Date.now()}`;
}

export function validateAndSanitizeGame(raw: RawTabletopGameInput): TabletopGameDefinition {
  const name = (raw.name || 'Unbenanntes Spiel').trim();
  const id = (raw.id || sanitizeGameSlug(name)).trim();

  const minPlayers = Math.max(1, typeof raw.minPlayers === 'number' ? raw.minPlayers : 1);
  const maxPlayers = Math.max(minPlayers, typeof raw.maxPlayers === 'number' ? raw.maxPlayers : 6);

  const rawWidgets = raw.widgets && typeof raw.widgets === 'object' ? raw.widgets : {};
  const cleanWidgets: Record<string, TabletopWidget> = {};

  let hasHands = false;

  for (const [wId, w] of Object.entries(rawWidgets)) {
    if (!w || typeof w !== 'object') continue;
    const wObj = w as Record<string, unknown>;
    const widgetId = String(wObj.id || wId).trim();
    if (!widgetId) continue;

    const base = {
      id: widgetId,
      type: w.type || 'card',
      x: typeof w.x === 'number' ? w.x : 0,
      y: typeof w.y === 'number' ? w.y : 0,
      width: typeof w.width === 'number' && w.width > 0 ? w.width : 80,
      height: typeof w.height === 'number' && w.height > 0 ? w.height : 120,
      zIndex: typeof w.zIndex === 'number' ? w.zIndex : 1,
      ownerSeat: typeof w.ownerSeat === 'number' ? w.ownerSeat : undefined,
      pinned: Boolean(w.pinned),
      label: typeof w.label === 'string' ? w.label : undefined,
    };

    if (w.type === 'holder' && (w.isHand || typeof w.ownerSeat === 'number')) {
      hasHands = true;
    }

    cleanWidgets[widgetId] = {
      ...w,
      ...base,
    } as TabletopWidget;
  }

  // Determine default supportedModes if not supplied
  const supportedModes: TabletopPlayMode[] = Array.isArray(raw.supportedModes) ? [...raw.supportedModes] : [];
  if (supportedModes.length === 0) {
    if (hasHands || maxPlayers > 1) {
      supportedModes.push('party_multi_device');
    }
    if (minPlayers === 1) {
      supportedModes.push('solo');
    }
    supportedModes.push('local_pass_and_play');
  }

  return {
    id,
    name,
    description: raw.description?.trim() || '',
    author: raw.author?.trim() || 'Community',
    version: typeof raw.version === 'string' ? raw.version.trim() || '1.0.0' : typeof raw.version === 'number' ? String(raw.version) : '1.0.0',
    minPlayers,
    maxPlayers,
    supportedModes,
    table: {
      width: raw.table?.width && raw.table.width > 200 ? raw.table.width : 1600,
      height: raw.table?.height && raw.table.height > 200 ? raw.table.height : 1000,
      backgroundColor: raw.table?.backgroundColor || '#1e3d2f', // Classic green felt
      backgroundImageUrl: raw.table?.backgroundImageUrl || undefined,
      gridSnap: raw.table?.gridSnap && raw.table.gridSnap > 0 ? raw.table.gridSnap : 20,
    },
    widgets: cleanWidgets,
    assetFiles: raw.assetFiles || {},
    updatedAt: raw.updatedAt || Date.now(),
  };
}
