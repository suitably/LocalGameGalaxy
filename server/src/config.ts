import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { ApiKey, ServerConfigData } from './core/types';
import {
  applyEnvOverrides,
  readEnvOverrides,
  stripLeakedEnvValues,
  type EnvOverrides,
} from './core/configSources';

const defaultConfig: ServerConfigData = {
  directories: [],
  tabletopDirectories: [],
  notesDir: null,
  port: 3000,
  token: null,
  downloadDir: null,
  usdbUsername: null,
  usdbPassword: null,
  apiKeys: [],
  defaultDownloadMode: 'stream',
  autoVocalSeparation: false,
  githubOwner: 'suitably',
  githubRepo: 'LocalGameGalaxy',
  githubToken: null,
};

const isDirectory = (loc: string): boolean => {
  try {
    return fs.existsSync(loc) && fs.statSync(loc).isDirectory();
  } catch {
    return false;
  }
};

/** Standard data folders that exist: the Docker mount `/app/<name>` and `<cwd>/<name>` (binaries). */
const existingDataDirs = (name: string): string[] =>
  [path.join('/app', name), path.join(process.cwd(), name)].filter(isDirectory);

/** Where a data folder lives when nothing is configured: the Docker mount if present, else next to the binary. */
export const defaultDataDir = (name: string): string =>
  existingDataDirs(name)[0] ?? path.resolve(name);

export class ConfigManager {
  private activeConfigFile: string = path.join(process.cwd(), 'config.json');
  /** What config.json holds. Setters mutate this; `saveConfig()` writes only this. */
  private fileConfig: ServerConfigData = { ...defaultConfig };
  private envOverrides: EnvOverrides = readEnvOverrides({});
  /** Runtime view (`fileConfig` + env overrides). Getters read this. */
  private currentConfig: ServerConfigData = { ...defaultConfig };

  constructor() {
    this.loadConfig();
  }

  public loadConfig(): void {
    const explicitConfigPath = process.env.CONFIG_PATH
      ? path.resolve(process.env.CONFIG_PATH)
      : null;

    const searchPaths = [
      ...(explicitConfigPath ? [path.dirname(explicitConfigPath)] : []),
      '/app/config',
      process.cwd(),
      path.dirname(process.execPath),
      path.resolve(path.dirname(process.execPath), '..'),
    ];

    const uniquePaths = [...new Set(searchPaths)];
    let foundConfig: string | null = null;

    // Check explicit path first if provided
    if (explicitConfigPath && fs.existsSync(explicitConfigPath)) {
      try {
        const stat = fs.statSync(explicitConfigPath);
        if (stat.isFile()) {
          console.log(`[Config] Found config at explicit path: ${explicitConfigPath}`);
          this.activeConfigFile = explicitConfigPath;
          foundConfig = explicitConfigPath;
        }
      } catch {
        // Ignore filesystem check errors
      }
    }

    if (!foundConfig) {
      for (const searchDir of uniquePaths) {
        const p = path.join(searchDir, 'config.json');
        try {
          if (fs.existsSync(p)) {
            const stat = fs.statSync(p);
            if (stat.isFile()) {
              console.log(`[Config] Found config at: ${p}`);
              this.activeConfigFile = p;
              foundConfig = p;
              break;
            }
          }
        } catch {
          // Ignore filesystem check errors
        }
      }
    }

    if (foundConfig) {
      try {
        const fileContent = fs.readFileSync(foundConfig, 'utf-8');
        const savedConfig = JSON.parse(fileContent) as Partial<ServerConfigData>;
        this.fileConfig = { ...defaultConfig, ...savedConfig };

        if (!Array.isArray(this.fileConfig.directories)) {
          this.fileConfig.directories = [...defaultConfig.directories];
        }
        if (!Array.isArray(this.fileConfig.tabletopDirectories)) {
          this.fileConfig.tabletopDirectories = [...defaultConfig.tabletopDirectories];
        }
        if (!Array.isArray(this.fileConfig.apiKeys)) {
          this.fileConfig.apiKeys = [...defaultConfig.apiKeys];
        }
      } catch (e) {
        console.error(`[Config] Failed to parse config at ${foundConfig}:`, e);
      }
    } else {
      // Default to explicitConfigPath, or /app/config/config.json if /app/config directory exists, else process.cwd()
      if (explicitConfigPath) {
        this.activeConfigFile = explicitConfigPath;
      } else if (fs.existsSync('/app/config') && fs.statSync('/app/config').isDirectory()) {
        this.activeConfigFile = '/app/config/config.json';
      } else {
        this.activeConfigFile = path.join(process.cwd(), 'config.json');
      }
      console.log(`[Config] Using configuration location: ${this.activeConfigFile}`);
    }

    // Env overrides apply at runtime only and are never persisted (#409).
    this.envOverrides = readEnvOverrides(
      process.env,
      existingDataDirs('music'),
      existingDataDirs('tabletop'),
    );

    const { config: cleaned, dropped } = stripLeakedEnvValues(
      this.fileConfig,
      this.envOverrides,
      defaultConfig.port,
    );
    this.fileConfig = cleaned;
    this.refreshEffectiveConfig();
    if (dropped.length > 0) {
      console.warn(
        `[Config] Removed values from ${this.activeConfigFile} that duplicate environment overrides: ${dropped.join(', ')}`,
      );
    }

    // Generate a token if neither the file nor the environment provides one; only this one is persisted.
    if (!this.currentConfig.token) {
      this.fileConfig.token = crypto.randomBytes(16).toString('hex');
      this.refreshEffectiveConfig();
      this.saveConfig();
    } else if (dropped.length > 0) {
      this.saveConfig();
    }
  }

  private refreshEffectiveConfig(): void {
    this.currentConfig = applyEnvOverrides(this.fileConfig, this.envOverrides);
  }

  public saveConfig(): void {
    try {
      if (fs.existsSync(this.activeConfigFile)) {
        const stat = fs.statSync(this.activeConfigFile);
        if (stat.isDirectory()) {
          return;
        }
      } else {
        const parentDir = path.dirname(this.activeConfigFile);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
      }
      fs.writeFileSync(this.activeConfigFile, JSON.stringify(this.fileConfig, null, 2), 'utf-8');
      console.log('[Config] Saved config to', this.activeConfigFile);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err && (err.code === 'EROFS' || err.code === 'EACCES' || err.code === 'EISDIR')) {
        console.log('[Config] Read-only environment: operating with in-memory configuration.');
      } else {
        console.error('[Config] Failed to save config:', e);
      }
    }
  }

  get port(): number {
    return this.currentConfig.port;
  }

  set port(value: number) {
    this.fileConfig.port = value;
    this.refreshEffectiveConfig();
    this.saveConfig();
  }

  get directories(): string[] {
    return this.currentConfig.directories;
  }

  get token(): string | null {
    return this.currentConfig.token;
  }

  set token(value: string | null) {
    this.fileConfig.token = value;
    this.refreshEffectiveConfig();
    this.saveConfig();
  }

  public addDirectory(dirPath: string): void {
    if (!this.fileConfig.directories.includes(dirPath)) {
      this.fileConfig.directories.push(dirPath);
      this.refreshEffectiveConfig();
      this.saveConfig();
    }
  }

  public removeDirectory(dirPath: string): void {
    this.fileConfig.directories = this.fileConfig.directories.filter((d) => d !== dirPath);
    const downloadDirRemoved = this.currentConfig.downloadDir === dirPath;
    if (this.fileConfig.downloadDir === dirPath) {
      this.fileConfig.downloadDir = null;
    }
    this.refreshEffectiveConfig();
    if (downloadDirRemoved) {
      console.log(
        `[Config] downloadDir was removed. Falling back to: ${this.currentConfig.downloadDir}`,
      );
    }
    this.refreshEffectiveConfig();
    this.saveConfig();
  }

  get tabletopDirectories(): string[] {
    return this.currentConfig.tabletopDirectories || [];
  }

  set tabletopDirectories(value: string[]) {
    this.fileConfig.tabletopDirectories = value;
    this.refreshEffectiveConfig();
    this.saveConfig();
  }

  public addTabletopDirectory(dirPath: string): void {
    if (!this.fileConfig.tabletopDirectories.includes(dirPath)) {
      this.fileConfig.tabletopDirectories.push(dirPath);
      this.refreshEffectiveConfig();
      this.saveConfig();
    }
  }

  public removeTabletopDirectory(dirPath: string): void {
    this.fileConfig.tabletopDirectories = this.fileConfig.tabletopDirectories.filter(
      (d) => d !== dirPath,
    );
    this.refreshEffectiveConfig();
    this.saveConfig();
  }

  /** Melodiq Notes library folder (NOTES_DIR, config `notesDir`, or the default data folder `notes`). */
  get notesDir(): string {
    return this.currentConfig.notesDir || defaultDataDir('notes');
  }

  /** Folder that games saved from the client go to (first tabletop directory, else `tabletop`). */
  get tabletopSaveRoot(): string {
    return this.tabletopDirectories[0] ?? defaultDataDir('tabletop');
  }

  get downloadDir(): string | null {
    return this.currentConfig.downloadDir;
  }

  set downloadDir(value: string | null) {
    this.fileConfig.downloadDir = value;
    this.refreshEffectiveConfig();
    this.saveConfig();
  }

  get usdbUsername(): string | null {
    return this.currentConfig.usdbUsername;
  }

  get usdbPassword(): string | null {
    return this.currentConfig.usdbPassword;
  }

  public setUsdbCredentials(username?: string | null, password?: string | null): void {
    this.fileConfig.usdbUsername = username || null;
    this.fileConfig.usdbPassword = password || null;
    this.refreshEffectiveConfig();
    this.saveConfig();
  }

  get defaultDownloadMode(): 'stream' | 'mp4' | 'none' {
    return this.currentConfig.defaultDownloadMode;
  }

  set defaultDownloadMode(value: 'stream' | 'mp4' | 'none') {
    this.fileConfig.defaultDownloadMode = value;
    this.refreshEffectiveConfig();
    this.saveConfig();
  }

  get autoVocalSeparation(): boolean {
    return this.currentConfig.autoVocalSeparation;
  }

  set autoVocalSeparation(value: boolean) {
    this.fileConfig.autoVocalSeparation = value;
    this.refreshEffectiveConfig();
    this.saveConfig();
  }

  get apiKeys(): ApiKey[] {
    return this.currentConfig.apiKeys || [];
  }

  public createApiKey(
    name?: string,
    allowManagement?: boolean,
    allowSongDeletion?: boolean,
  ): ApiKey {
    if (!this.fileConfig.apiKeys) {
      this.fileConfig.apiKeys = [];
    }
    const token = crypto.randomBytes(16).toString('hex');
    const id = crypto.randomBytes(8).toString('hex');
    const keyObj: ApiKey = {
      id,
      name: name || 'Unnamed Key',
      token,
      allowManagement: allowManagement === true,
      allowSongDeletion: allowSongDeletion === true,
      createdAt: new Date().toISOString(),
    };
    this.fileConfig.apiKeys.push(keyObj);
    this.refreshEffectiveConfig();
    this.saveConfig();
    return keyObj;
  }

  public updateApiKey(
    id: string,
    updates: Partial<Pick<ApiKey, 'name' | 'allowManagement' | 'allowSongDeletion'>>,
  ): ApiKey | false {
    if (!this.fileConfig.apiKeys) return false;
    const keyIndex = this.fileConfig.apiKeys.findIndex((k) => k.id === id);
    if (keyIndex !== -1) {
      if (updates.name !== undefined) {
        this.fileConfig.apiKeys[keyIndex].name =
          updates.name || this.fileConfig.apiKeys[keyIndex].name;
      }
      if (updates.allowManagement !== undefined) {
        this.fileConfig.apiKeys[keyIndex].allowManagement = updates.allowManagement === true;
      }
      if (updates.allowSongDeletion !== undefined) {
        this.fileConfig.apiKeys[keyIndex].allowSongDeletion = updates.allowSongDeletion === true;
      }
      this.refreshEffectiveConfig();
      this.saveConfig();
      return this.fileConfig.apiKeys[keyIndex];
    }
    return false;
  }

  public deleteApiKey(id: string): boolean {
    if (!this.fileConfig.apiKeys) return false;
    const initialLength = this.fileConfig.apiKeys.length;
    this.fileConfig.apiKeys = this.fileConfig.apiKeys.filter((k) => k.id !== id);
    if (this.fileConfig.apiKeys.length !== initialLength) {
      this.refreshEffectiveConfig();
      this.saveConfig();
      return true;
    }
    return false;
  }

  get githubOwner(): string {
    return this.currentConfig.githubOwner || 'suitably';
  }

  set githubOwner(value: string) {
    this.fileConfig.githubOwner = value || 'suitably';
    this.refreshEffectiveConfig();
    this.saveConfig();
  }

  get githubRepo(): string {
    return this.currentConfig.githubRepo || 'LocalGameGalaxy';
  }

  set githubRepo(value: string) {
    this.fileConfig.githubRepo = value || 'LocalGameGalaxy';
    this.refreshEffectiveConfig();
    this.saveConfig();
  }

  get githubToken(): string | null {
    return this.currentConfig.githubToken || null;
  }

  set githubToken(value: string | null) {
    this.fileConfig.githubToken = value || null;
    this.refreshEffectiveConfig();
    this.saveConfig();
  }
}

export const serverConfig = new ConfigManager();
export default serverConfig;
