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
  | 'spinner'
  | 'counter'
  | 'label';

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
}

export interface CardContent {
  type: 'text' | 'image';
  value: string;
  color?: string;
}

export interface CardWidget extends BaseWidget {
  type: 'card';
  deckId?: string;
  frontContent: CardContent;
  backContent: CardContent;
  faceUp: boolean;
  rotation: number;
}

export interface DeckWidget extends BaseWidget {
  type: 'deck';
  cardIds: string[];
  backContent: CardContent;
}

export interface HolderWidget extends BaseWidget {
  type: 'holder';
  dropTargetTypes: WidgetType[];
  childIds: string[];
  layout: 'stack' | 'fan' | 'grid';
  isHand?: boolean; // True for player hands
  dropTarget?: boolean; // True if public discard/play target
}

export interface TokenWidget extends BaseWidget {
  type: 'token';
  color: string;
  shape: 'circle' | 'square' | 'meeple';
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

export type TabletopWidget =
  | CardWidget
  | DeckWidget
  | HolderWidget
  | TokenWidget
  | CounterWidget
  | DieWidget;

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
  version: string;
  minPlayers: number;
  maxPlayers: number;
  supportedModes: TabletopPlayMode[];
}

export interface TabletopGameDefinition extends TabletopGameMetadata {
  table: TabletopTableConfig;
  widgets: Record<string, TabletopWidget>;
  assetFiles?: Record<string, string>; // Base64 or Blob URLs
  updatedAt?: number;
}

export interface TabletopGameSummary extends TabletopGameMetadata {
  cardCount: number;
  widgetCount: number;
  updatedAt: number;
}
