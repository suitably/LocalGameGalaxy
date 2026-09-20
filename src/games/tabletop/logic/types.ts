/**
 * Tabletop Game Types & Domain Model [ID: GAME-TABLETOP-TYPES]
 */

export type TabletopPlayMode = 'party_multi_device' | 'local_pass_and_play' | 'solo';

export type WidgetType =
  | 'card'
  | 'deck'
  | 'holder'
  | 'token'
  | 'die'
  | 'counter'
  | 'seat';

/** A single renderable object within a card face template */
export interface FaceObject {
  type: 'image' | 'text';
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  clipPath?: string;
  css?: string;
  borderRadius?: string;
  fontSize?: number;
  textAlign?: string;
  color?: string;
}

/** Grid snap definition for widget positioning */
export interface GridSnapDef {
  type?: string;
  x: number;
  y: number;
  offsetX?: number;
  offsetY?: number;
  alignX?: number;
  alignY?: number;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export interface BaseWidget {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  ownerSeat?: number; // 0-indexed player seat if private
  pinned?: boolean;
  label?: string;
  clipPath?: string;
  borderRadius?: string | number;
  customCss?: string;
  image?: string;
  parent?: string;
  display?: boolean;
  movable?: boolean;
  grid?: GridSnapDef[];
  hasPileChild?: boolean;
}

export interface CardContent {
  type: 'text' | 'image';
  value: string;
  color?: string;
}

export interface CardWidget extends BaseWidget {
  type: 'card';
  deckId?: string;
  cardType?: string;
  frontContent: CardContent;
  backContent: CardContent;
  faceUp: boolean;
  rotation: number;
  inPile?: boolean;
  pileId?: string;
  isTransparent?: boolean;
  stackCount?: number;
  /** Multi-layer face objects from face template (when present, replaces frontContent for rendering) */
  faceObjects?: FaceObject[];
  /** Multi-layer back face objects from face template (for custom card backs) */
  backFaceObjects?: FaceObject[];
  /** VTT activeFace index (0 = back, 1+ = front faces) */
  activeFace?: number;
}

export interface DeckWidget extends BaseWidget {
  type: 'deck';
  cardIds: string[];
  backContent: CardContent;
  frontContent?: CardContent;
  isPile?: boolean;
  cardCount?: number;
  rotation?: number;
}

export interface HolderWidget extends BaseWidget {
  type: 'holder';
  dropTargetTypes: WidgetType[];
  childIds: string[];
  layout: 'stack' | 'fan' | 'grid';
  isHand?: boolean; // True for player hands
  dropTarget?: boolean; // True if public discard/play target
  rotation?: number;
}

export interface TokenWidget extends BaseWidget {
  type: 'token';
  color: string;
  shape: 'circle' | 'square' | 'meeple';
  subText?: string;
  textColor?: string;
  rotation?: number;
}

export interface CounterWidget extends BaseWidget {
  type: 'counter';
  value: number;
  step: number;
  min?: number;
  max?: number;
}

export interface DieWidget extends BaseWidget {
  type: 'die';
  currentValue: number;
  sides: number;
  rolling?: boolean;
  color?: string;
  pipColor?: string;
}

export interface SeatWidget extends BaseWidget {
  type: 'seat';
  index: number;
  color: string;
  player?: string;
  hand?: string;
  turn?: boolean;
}

export type TabletopWidget =
  | CardWidget
  | DeckWidget
  | HolderWidget
  | TokenWidget
  | CounterWidget
  | DieWidget
  | SeatWidget;

export interface TabletopTableConfig {
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  gridSnap?: number;
}

export interface TabletopGameMetadata {
  id: string;
  name: string;
  description?: string;
  author?: string;
  version?: string;
  minPlayers?: number;
  maxPlayers?: number;
  supportedModes?: TabletopPlayMode[];
}

export interface TabletopGameDefinition extends TabletopGameMetadata {
  version: string;
  minPlayers: number;
  maxPlayers: number;
  supportedModes: TabletopPlayMode[];
  table: TabletopTableConfig;
  widgets: Record<string, TabletopWidget>;
  assetFiles?: Record<string, string>; // Base64 or Blob URLs
  updatedAt?: number;
  ruleText?: string;
}

export interface TabletopGameSummary extends TabletopGameMetadata {
  version: string;
  minPlayers: number;
  maxPlayers: number;
  supportedModes: TabletopPlayMode[];
  cardCount: number;
  widgetCount: number;
  updatedAt: number;
  format?: 'flat-json' | 'pcio-folder' | 'unknown';
}
