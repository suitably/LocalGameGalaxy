import type { Hono } from 'hono';

export interface ApiKey {
  id: string;
  name: string;
  token: string;
  allowManagement: boolean;
  allowSongDeletion: boolean;
  createdAt: string;
}

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
}

export interface ServerConfigData {
  directories: string[];
  tabletopDirectories: string[];
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

export type ClientTabletopGameEntry = Omit<TabletopGameEntry, 'jsonPath' | 'assetsDir'>;

export interface TabletopRawResponse {
  id: string;
  rawJson: string;
  assetMap: Record<string, string>;
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
  txtPath: string;
  txtContent: string;
  duration: number;
  searchString: string;
}

export type ClientSong = Song;

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
