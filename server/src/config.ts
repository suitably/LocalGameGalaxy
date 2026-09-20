import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { ApiKey, ServerConfigData } from './core/types';

const defaultConfig: ServerConfigData = {
  directories: [],
  tabletopDirectories: [],
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

export class ConfigManager {
  private activeConfigFile: string = path.join(process.cwd(), 'config.json');
  private currentConfig: ServerConfigData = { ...defaultConfig };

  constructor() {
    this.loadConfig();
  }

  public loadConfig(): void {
    const explicitConfigPath = process.env.CONFIG_PATH ? path.resolve(process.env.CONFIG_PATH) : null;

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
        this.currentConfig = { ...defaultConfig, ...savedConfig };

        if (!Array.isArray(this.currentConfig.directories)) {
          this.currentConfig.directories = [...defaultConfig.directories];
        }
        if (!Array.isArray(this.currentConfig.tabletopDirectories)) {
          this.currentConfig.tabletopDirectories = [...defaultConfig.tabletopDirectories];
        }
        if (!Array.isArray(this.currentConfig.apiKeys)) {
          this.currentConfig.apiKeys = [...defaultConfig.apiKeys];
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

    // 1. Environment Variable Overrides
    if (process.env.PORT) {
      const parsedPort = parseInt(process.env.PORT, 10);
      if (!Number.isNaN(parsedPort) && parsedPort > 0) {
        this.currentConfig.port = parsedPort;
      }
    }

    const envToken = process.env.SECURITY_TOKEN || process.env.TOKEN;
    if (envToken && typeof envToken === 'string' && envToken.trim()) {
      this.currentConfig.token = envToken.trim().replace(/^["']|["']$/g, '');
    }

    // 2. Music Directory Discovery & Overrides
    const candidateDirs: string[] = [];
    if (process.env.MUSIC_DIR) {
      candidateDirs.push(
        ...process.env.MUSIC_DIR.split(',')
          .map((d) => d.trim())
          .filter(Boolean)
      );
    }
    if (process.env.DIRECTORIES) {
      candidateDirs.push(
        ...process.env.DIRECTORIES.split(',')
          .map((d) => d.trim())
          .filter(Boolean)
      );
    }

    // Standard container & local music directories
    const standardMusicLocations = ['/app/music', path.join(process.cwd(), 'music')];
    for (const loc of standardMusicLocations) {
      try {
        if (fs.existsSync(loc) && fs.statSync(loc).isDirectory()) {
          candidateDirs.push(loc);
        }
      } catch {
        // Ignore stat errors
      }
    }

    for (const dir of candidateDirs) {
      const resolved = path.resolve(dir);
      if (!this.currentConfig.directories.some((d) => path.resolve(d) === resolved)) {
        this.currentConfig.directories.push(dir);
      }
    }

    if (this.currentConfig.directories.length > 0 && !this.currentConfig.downloadDir) {
      this.currentConfig.downloadDir = this.currentConfig.directories[0];
    }

    // 2b. Tabletop Directory Discovery & Overrides
    if (process.env.TABLETOP_DIR) {
      process.env.TABLETOP_DIR.split(',')
        .map((d) => d.trim())
        .filter(Boolean)
        .forEach((dir) => {
          if (!this.currentConfig.tabletopDirectories.includes(dir)) {
            this.currentConfig.tabletopDirectories.push(dir);
          }
        });
    }

    // 3. Generate token if still missing
    if (!this.currentConfig.token) {
      this.currentConfig.token = crypto.randomBytes(16).toString('hex');
      this.saveConfig();
    }
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
      fs.writeFileSync(this.activeConfigFile, JSON.stringify(this.currentConfig, null, 2), 'utf-8');
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
    this.currentConfig.port = value;
    this.saveConfig();
  }

  get directories(): string[] {
    return this.currentConfig.directories;
  }

  get token(): string | null {
    return this.currentConfig.token;
  }

  set token(value: string | null) {
    this.currentConfig.token = value;
    this.saveConfig();
  }

  public addDirectory(dirPath: string): void {
    if (!this.currentConfig.directories.includes(dirPath)) {
      this.currentConfig.directories.push(dirPath);
      this.saveConfig();
    }
  }

  public removeDirectory(dirPath: string): void {
    this.currentConfig.directories = this.currentConfig.directories.filter((d) => d !== dirPath);
    if (this.currentConfig.downloadDir === dirPath) {
      this.currentConfig.downloadDir = this.currentConfig.directories[0] || null;
      console.log(`[Config] downloadDir was removed. Falling back to: ${this.currentConfig.downloadDir}`);
    }
    this.saveConfig();
  }

  get tabletopDirectories(): string[] {
    return this.currentConfig.tabletopDirectories || [];
  }

  set tabletopDirectories(value: string[]) {
    this.currentConfig.tabletopDirectories = value;
    this.saveConfig();
  }

  public addTabletopDirectory(dirPath: string): void {
    if (!this.currentConfig.tabletopDirectories.includes(dirPath)) {
      this.currentConfig.tabletopDirectories.push(dirPath);
      this.saveConfig();
    }
  }

  public removeTabletopDirectory(dirPath: string): void {
    this.currentConfig.tabletopDirectories = this.currentConfig.tabletopDirectories.filter(
      (d) => d !== dirPath
    );
    this.saveConfig();
  }

  get downloadDir(): string | null {
    return this.currentConfig.downloadDir;
  }

  set downloadDir(value: string | null) {
    this.currentConfig.downloadDir = value;
    this.saveConfig();
  }

  get usdbUsername(): string | null {
    return this.currentConfig.usdbUsername;
  }

  get usdbPassword(): string | null {
    return this.currentConfig.usdbPassword;
  }

  public setUsdbCredentials(username?: string | null, password?: string | null): void {
    this.currentConfig.usdbUsername = username || null;
    this.currentConfig.usdbPassword = password || null;
    this.saveConfig();
  }

  get defaultDownloadMode(): 'stream' | 'mp4' | 'none' {
    return this.currentConfig.defaultDownloadMode;
  }

  set defaultDownloadMode(value: 'stream' | 'mp4' | 'none') {
    this.currentConfig.defaultDownloadMode = value;
    this.saveConfig();
  }

  get autoVocalSeparation(): boolean {
    return this.currentConfig.autoVocalSeparation;
  }

  set autoVocalSeparation(value: boolean) {
    this.currentConfig.autoVocalSeparation = value;
    this.saveConfig();
  }

  get apiKeys(): ApiKey[] {
    return this.currentConfig.apiKeys || [];
  }

  public createApiKey(name?: string, allowManagement?: boolean, allowSongDeletion?: boolean): ApiKey {
    if (!this.currentConfig.apiKeys) {
      this.currentConfig.apiKeys = [];
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
    this.currentConfig.apiKeys.push(keyObj);
    this.saveConfig();
    return keyObj;
  }

  public updateApiKey(
    id: string,
    updates: Partial<Pick<ApiKey, 'name' | 'allowManagement' | 'allowSongDeletion'>>
  ): ApiKey | false {
    if (!this.currentConfig.apiKeys) return false;
    const keyIndex = this.currentConfig.apiKeys.findIndex((k) => k.id === id);
    if (keyIndex !== -1) {
      if (updates.name !== undefined) {
        this.currentConfig.apiKeys[keyIndex].name = updates.name || this.currentConfig.apiKeys[keyIndex].name;
      }
      if (updates.allowManagement !== undefined) {
        this.currentConfig.apiKeys[keyIndex].allowManagement = updates.allowManagement === true;
      }
      if (updates.allowSongDeletion !== undefined) {
        this.currentConfig.apiKeys[keyIndex].allowSongDeletion = updates.allowSongDeletion === true;
      }
      this.saveConfig();
      return this.currentConfig.apiKeys[keyIndex];
    }
    return false;
  }

  public deleteApiKey(id: string): boolean {
    if (!this.currentConfig.apiKeys) return false;
    const initialLength = this.currentConfig.apiKeys.length;
    this.currentConfig.apiKeys = this.currentConfig.apiKeys.filter((k) => k.id !== id);
    if (this.currentConfig.apiKeys.length !== initialLength) {
      this.saveConfig();
      return true;
    }
    return false;
  }

  get githubOwner(): string {
    return this.currentConfig.githubOwner || 'suitably';
  }

  set githubOwner(value: string) {
    this.currentConfig.githubOwner = value || 'suitably';
    this.saveConfig();
  }

  get githubRepo(): string {
    return this.currentConfig.githubRepo || 'LocalGameGalaxy';
  }

  set githubRepo(value: string) {
    this.currentConfig.githubRepo = value || 'LocalGameGalaxy';
    this.saveConfig();
  }

  get githubToken(): string | null {
    return this.currentConfig.githubToken || null;
  }

  set githubToken(value: string | null) {
    this.currentConfig.githubToken = value || null;
    this.saveConfig();
  }
}

export const serverConfig = new ConfigManager();
export default serverConfig;
