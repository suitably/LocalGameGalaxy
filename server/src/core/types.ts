import type { Hono } from 'hono';
import type { PairingStore } from './pairing';

export interface ApiKey {
  id: string;
  name: string;
  token: string;
  allowManagement: boolean;
  allowSongDeletion: boolean;
  /** Tabletop: store named table states (save games) on the server. Missing in older configs. */
  allowTabletopSaves?: boolean;
  /** Tabletop: replace a game's default template (what a new table starts from). */
  allowTabletopTemplates?: boolean;
  createdAt: string;
}

/** Capability flags of an API key; the master token and management keys hold all of them. */
export type ApiKeyPermission =
  'allowManagement' | 'allowSongDeletion' | 'allowTabletopSaves' | 'allowTabletopTemplates';

export type HonoEnv = {
  Variables: {
    isMasterToken: boolean;
    apiKey?: ApiKey;
  };
};

export interface ServerConfig {
  port: number;
  token?: string;
  allowedOrigins?: string[];
  enableTunnel?: boolean;
  activePlugins: string[];
  musicDir?: string;
  modelsDir?: string;
  /** Pairing code store; defaults to the process-wide one (tests inject their own). */
  pairingStore?: PairingStore;
}

export interface ServerConfigData {
  directories: string[];
  tabletopDirectories: string[];
  /** Melodiq Notes library (scores, recordings, bar marks); null = default data folder. */
  notesDir: string | null;
  port: number;
  token: string | null;
  downloadDir: string | null;
  usdbUsername: string | null;
  usdbPassword: string | null;
  apiKeys: ApiKey[];
  defaultDownloadMode: 'stream' | 'mp4' | 'none';
  autoVocalSeparation: boolean;
  githubOwner: string;
  githubRepo: string;
  githubToken: string | null;
}

export interface TabletopGameEntry {
  id: string; // crypto hash von jsonPath
  name: string;
  author?: string;
  description?: string;
  widgetCount: number;
  cardCount: number;
  format: 'flat-json' | 'pcio-folder' | 'tts-workshop' | 'unknown';
  jsonPath: string; // absoluter Pfad zur JSON-Datei
  assetsDir: string | null; // absoluter Pfad zu assets/-Ordner oder null
  updatedAt: number;
}

export type ClientTabletopGameEntry = Omit<TabletopGameEntry, 'jsonPath' | 'assetsDir'> & {
  /** Saved via the API, so it can be overwritten and deleted. */
  saved: boolean;
};

export interface TabletopRawResponse {
  id: string;
  rawJson: string;
  assetMap: Record<string, string>;
  /** rawJson is the stored default template, not the game file (see PUT .../template). */
  template?: boolean;
}

export interface GalaxyPlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  init: (app: Hono<HonoEnv>, config: ServerConfig) => Promise<void> | void;
  destroy?: () => Promise<void> | void;
}

export interface RoomPeer {
  id: string;
  name: string;
  joinedAt: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  gap: number;
  edition?: string;
  genre?: string;
  language?: string;
  year?: string;
  video: string | null;
  audio: string | null;
  originalAudio: string | null;
  instrumentalAudio: string | null;
  vocalsAudio: string | null;
  hasSeparation: boolean;
  cover: string | null;
  background: string | null;
  /** The karaoke `.txt`; empty for a song without one (sheet music only, #568). */
  txtPath: string;
  txtContent: string;
  duration: number;
  searchString: string;
  /** Absolute path of the song folder, the only store for Melodiq and Melodiq Notes (#568). */
  folder: string;
  /** True when the song has a karaoke `.txt`; songs without one are listed only for Notes. */
  karaoke: boolean;
  /** Sheet music (MusicXML/MIDI) in the song folder, with `<score>.marks.json` bar marks. */
  folderScores: SongScore[];
  /** Audio in the song folder besides the mix and its stems (e.g. Notes recordings). */
  recordings: SongRecording[];
  /** Label per score file, from `song.json`. */
  labels: Record<string, string>;
}

export interface SongScore {
  file: string;
  path: string;
  marksPath: string | null;
  mtimeMs: number;
}

export interface SongRecording {
  file: string;
  path: string;
  mtimeMs: number;
}

/** A score in the song folder as clients see it. */
export interface ClientSongScore {
  file: string;
  /** Media URL of the score file. */
  url: string | null;
  hasMarks: boolean;
  /** Free text shown instead of the file name (`song.json`), or null. */
  label: string | null;
}

export type ClientSong = Omit<Song, 'folderScores' | 'folder' | 'recordings' | 'labels'> & {
  scores: ClientSongScore[];
  recordings: { file: string; url: string | null }[];
};

export interface DownloadJob {
  jobId: string;
  usdbId: string | null;
  artist: string;
  title: string;
  videoMode: 'stream' | 'mp4' | 'none';
  youtubeUrl: string | null;
  targetDir: string | null;
  safeName: string | null;
  skipAudio: boolean;
  audioFile: string | null;
  /** Existing song folder to download into; once done, the indexed song (also for new folders). */
  songId: string | null;
  status: 'pending' | 'running' | 'done' | 'error';
  progress: number;
  log: string[];
  error: string | null;
}

export interface SeparatorJob {
  jobId: string;
  type: 'separate' | 'full-sync' | 'install';
  songId?: string;
  songDir?: string;
  audioFile?: string;
  vocalsFile?: string | null;
  txtFile?: string;
  safeName?: string;
  status: 'pending' | 'running' | 'done' | 'error';
  progress: number;
  log: string[];
  error: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  songs: string[];
  creatorToken?: string;
  updatedAt: number;
}
