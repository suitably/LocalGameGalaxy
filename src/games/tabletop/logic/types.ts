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
  | 'seat'
  | 'bag'
  | 'label'
  | 'timer'
  | 'spinner'
  | 'button';

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

/** Look of one alternative state (TTS `States`); switched with `NEXT_STATE`. */
export interface WidgetStateFace {
  label?: string;
  image?: string;
  color?: string;
  width?: number;
  height?: number;
  clipPath?: string;
  frontContent?: CardContent;
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
  /** Set on a copy blanked for a device outside its hidden zone (#551); never in the host's state. */
  redacted?: true;
  /** Moving it does not raise it (labels that must stay above or below pieces). */
  keepZOrder?: boolean;
  label?: string;
  /** i18n key for `label` (built-in games); applied on load by `localizeLabels`. */
  labelKey?: string;
  /** Values for `labelKey`; each is looked up under `games.tabletop.labels.<value>` first. */
  labelParams?: Record<string, string | number>;
  clipPath?: string;
  borderRadius?: string | number;
  customCss?: string;
  image?: string;
  parent?: string;
  supplyHolderId?: string;
  /** Alternative looks; index 0 is the imported state. */
  states?: WidgetStateFace[];
  stateIndex?: number;
  display?: boolean;
  movable?: boolean;
  grid?: GridSnapDef[];
  hasPileChild?: boolean;
  showAlways?: boolean;
  defaultWidth?: number;
  defaultHeight?: number;
}

export interface CardContent {
  type: 'text' | 'image';
  value: string;
  color?: string;
  /** TTS spritesheet metadata for CSS-based card rendering */
  spriteSheet?: {
    url: string;
    col: number;
    row: number;
    numWidth: number;
    numHeight: number;
  };
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
  faceUp?: boolean;
  activeFace?: number;
  faceObjects?: FaceObject[];
  backFaceObjects?: FaceObject[];
  /** Counts shuffles; a change plays the shuffle animation on every device. */
  shuffleCount?: number;
  /** Shuffle this deck whenever a fresh game starts (not when a session is resumed). */
  shuffleOnStart?: boolean;
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
  color?: string;
  shape?: 'circle' | 'square' | 'meeple' | 'rectangle';
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

export interface BagWidget extends BaseWidget {
  type: 'bag';
  color?: string; // Fabric/pouch color (from TTS ColorDiffuse)
  isInfinite?: boolean; // Infinite supply if true
  itemCount?: number; // Count for finite bags
  itemIds?: string[]; // IDs for finite bags
  templateWidget?: TabletopWidget; // Template widget to clone when drawn from
  previewImage?: string; // Preview image of contained token/item
  previewLabel?: string; // Label of contained token/item
}

/** Free text on the table. */
export interface LabelWidget extends BaseWidget {
  type: 'label';
  text: string;
  fontSize?: number;
  color?: string;
}

/** Countdown (`durationMs` > 0) or stopwatch; time runs while `runningSince` is set. */
export interface TimerWidget extends BaseWidget {
  type: 'timer';
  durationMs: number;
  elapsedMs: number;
  runningSince?: number;
}

/** Wheel with options; `value` is the index of the last result. */
export interface SpinnerWidget extends BaseWidget {
  type: 'spinner';
  options: string[];
  value?: number;
  angle: number;
}

/** A seat relative to the run: who pressed the button (host-resolved) or whose turn it is. */
export type RoutineSeatRef = 'caller' | 'turn';

export type RoutineCmp = '==' | '!=' | '<' | '<=' | '>' | '>=';

/** A number read from the table when an `IF` runs; see `logic/routineConditions.ts`. */
export type RoutineOperand =
  { of: 'counter' | 'die' | 'count' | 'state'; widget: string } | { of: 'turn' | 'caller' };

export interface RoutineCondition {
  left: RoutineOperand;
  cmp: RoutineCmp;
  right: number | RoutineOperand;
}

/** One step of a button routine; see `logic/routineParse.ts` for limits and validation. */
export type RoutineStep =
  | { op: 'SHUFFLE'; deck: string }
  | { op: 'DRAW'; deck: string; count?: number; to?: string }
  /** `dice` by id, or every die of a seat (`ownerSeat` or in that seat's hand). */
  | { op: 'ROLL'; dice?: string[]; seat?: RoutineSeatRef }
  | { op: 'FLIP'; cards: string[] }
  | { op: 'MOVE'; widget: string; x: number; y: number }
  | { op: 'SET'; widget: string; props: Record<string, unknown> }
  /** One counter by id, or every counter a seat owns (`ownerSeat`). */
  | { op: 'COUNTER'; counter?: string; seat?: RoutineSeatRef; delta: number }
  | { op: 'TIMER'; timer: string; action: 'toggle' | 'reset' }
  | { op: 'SPIN'; spinner: string }
  | { op: 'NEXT_STATE'; widget: string }
  /** `count` cards to every hand, round robin in seat order. */
  | { op: 'DEAL'; deck: string; count: number }
  | { op: 'TAKE_FROM_BAG'; bag: string; count?: number; to?: string }
  | { op: 'PLACE_IN_HOLDER'; widget: string; holder: string }
  | { op: 'SET_STATE'; widget: string; state: number }
  /** Moves the turn (`seat.turn`) to the next or previous seat, or to the caller. */
  | { op: 'TURN'; to?: 'next' | 'previous' | 'caller' }
  | { op: 'IF'; if: RoutineCondition; then: RoutineStep[]; else?: RoutineStep[] };

/** When a button's routine runs by itself (host side, after the action that caused it). */
export type RoutineTrigger =
  /** Something was put into this holder (or deck). */
  | { on: 'onDrop'; holder: string }
  /** A seat's turn started; `seat` limits it to one seat index. */
  | { on: 'onTurnStart'; seat?: number }
  /** A widget's centre moved into this hidden zone. */
  | { on: 'onEnterZone'; zone: string }
  /** This counter's value changed. */
  | { on: 'onCounter'; counter: string };

/** Clickable button that runs a fixed list of table actions (no code). */
export interface ButtonWidget extends BaseWidget {
  type: 'button';
  text: string;
  color?: string;
  routine: RoutineStep[];
  /** Events that run the routine without a click. */
  triggers?: RoutineTrigger[];
}

export type TabletopWidget =
  | CardWidget
  | DeckWidget
  | HolderWidget
  | TokenWidget
  | CounterWidget
  | DieWidget
  | SeatWidget
  | BagWidget
  | LabelWidget
  | TimerWidget
  | SpinnerWidget
  | ButtonWidget;

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

export interface HiddenZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string; // Player seat color or fog color e.g. '#4caf50' or '#222222'
  ownerSeat?: number; // 0-indexed player seat index that owns the zone; undefined = GM/table
  revealed?: boolean; // When true, content is temporarily revealed to all players
  label?: string;
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
  hiddenZones?: Record<string, HiddenZone>;
}

export interface TabletopGameSummary extends TabletopGameMetadata {
  version: string;
  minPlayers: number;
  maxPlayers: number;
  supportedModes: TabletopPlayMode[];
  cardCount: number;
  widgetCount: number;
  updatedAt: number;
  format?: 'flat-json' | 'pcio-folder' | 'tts-workshop' | 'unknown';
  /** Listed by the companion server and saved from the app there, so it can be changed. */
  serverSaved?: boolean;
}

export const HEX_CLIP_PATH = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
export const CIRCLE_CLIP_PATH = 'circle(50% at 50% 50%)';
