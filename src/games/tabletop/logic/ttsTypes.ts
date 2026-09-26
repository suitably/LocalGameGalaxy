/**
 * Tabletop Simulator (TTS) Save File TypeScript Interfaces [ID: GAME-TABLETOP-TTS-TYPES]
 *
 * These types model the TTS JSON save format used by Steam Workshop mods.
 * Reference: https://api.tabletopsimulator.com/save-file-format/
 */

/** 3D Transform used by all TTS objects */
export interface TTSTransform {
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

/** RGBA color (0.0–1.0 range) */
export interface TTSColorDiffuse {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/** Spritesheet definition for a card deck */
export interface TTSCustomDeckEntry {
  FaceURL: string;
  BackURL: string;
  NumWidth: number;
  NumHeight: number;
  BackIsHidden?: boolean;
  UniqueBack?: boolean;
  Type?: number;
}

/** Custom image for figurines, tokens, boards */
export interface TTSCustomImage {
  ImageURL: string;
  ImageSecondaryURL?: string;
  ImageScalar?: number;
  WidthScale?: number;
}

/** Custom 3D mesh */
export interface TTSCustomMesh {
  MeshURL: string;
  DiffuseURL: string;
  NormalURL?: string;
  ColliderURL?: string;
  Convex?: boolean;
  MaterialIndex?: number;
  TypeIndex?: number;
  CastShadows?: boolean;
}

/** A single object in the TTS scene */
export interface TTSObjectState {
  GUID: string;
  Name: string;
  Transform: TTSTransform;
  Nickname?: string;
  Description?: string;
  GMNotes?: string;
  ColorDiffuse?: TTSColorDiffuse;
  Locked?: boolean;
  Grid?: boolean;
  Snap?: boolean;
  Tooltip?: boolean;
  Hands?: boolean;
  HideWhenFaceDown?: boolean;
  SidewaysCard?: boolean;
  FogColor?: string;
  Value?: number;

  /** Card-specific: ID encoding deck + position */
  CardID?: number;
  /** Deck-specific: ordered list of card IDs */
  DeckIDs?: number[];
  /** Spritesheet definitions keyed by deck index string */
  CustomDeck?: Record<string, TTSCustomDeckEntry>;
  /** Nested objects (cards in a deck, items in a bag) */
  ContainedObjects?: TTSObjectState[];

  /** Custom visuals */
  CustomImage?: TTSCustomImage;
  CustomMesh?: TTSCustomMesh;

  /** Lua scripting (ignored for import) */
  LuaScript?: string;
  LuaScriptState?: string;
  XmlUI?: string;
}

/** Tab state for rules/notes panels */
export interface TTSTabState {
  title: string;
  body: string;
  color: string;
  visibleColor?: TTSColorDiffuse;
  id: number;
}

/** Root TTS save file structure */
export interface TTSSaveFile {
  SaveName: string;
  EpochTime?: number;
  Date?: string;
  VersionNumber?: string;
  GameMode?: string;
  GameType?: string;
  GameComplexity?: string;
  PlayingTime?: number[];
  PlayerCounts?: number[];
  Tags?: string[];
  Gravity?: number;
  PlayArea?: number;
  Table?: string;
  Sky?: string;
  SkyURL?: string;
  Note?: string;
  TabStates?: Record<string, TTSTabState>;
  ObjectStates: TTSObjectState[];
  DecalPallet?: unknown[];
  LuaScript?: string;
  LuaScriptState?: string;
  XmlUI?: string;
}

/** Parsed spritesheet reference for a single card */
export interface TTSSpriteRef {
  /** URL of the spritesheet image */
  url: string;
  /** Column index in the grid (0-based) */
  col: number;
  /** Row index in the grid (0-based) */
  row: number;
  /** Total columns in the spritesheet */
  numWidth: number;
  /** Total rows in the spritesheet */
  numHeight: number;
}
