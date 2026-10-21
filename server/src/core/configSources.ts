import path from 'node:path';
import type { ServerConfigData } from './types';

/**
 * Values supplied by the runtime environment (env vars and auto-discovered mounts).
 * They override the file config at runtime but are never written back to config.json.
 */
export interface EnvOverrides {
  port: number | null;
  token: string | null;
  directories: string[];
  tabletopDirectories: string[];
}

type Env = Record<string, string | undefined>;

/** Splits a comma-separated env value into trimmed, non-empty entries. */
export function parseEnvList(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * @param env usually `process.env`
 * @param discoveredMusicDirs existing standard mounts such as `/app/music`
 */
export function readEnvOverrides(env: Env, discoveredMusicDirs: string[] = []): EnvOverrides {
  const parsedPort = env.PORT ? parseInt(env.PORT, 10) : NaN;
  const rawToken = (env.SECURITY_TOKEN || env.TOKEN || '').trim();

  return {
    port: !Number.isNaN(parsedPort) && parsedPort > 0 ? parsedPort : null,
    token: rawToken ? rawToken.replace(/^["']|["']$/g, '') : null,
    directories: [
      ...parseEnvList(env.MUSIC_DIR),
      ...parseEnvList(env.DIRECTORIES),
      ...discoveredMusicDirs,
    ],
    tabletopDirectories: parseEnvList(env.TABLETOP_DIR),
  };
}

const sameDir = (a: string, b: string): boolean => path.resolve(a) === path.resolve(b);

function mergeDirs(base: string[], extra: string[]): string[] {
  const merged = [...base];
  for (const dir of extra) {
    if (!merged.some((existing) => sameDir(existing, dir))) merged.push(dir);
  }
  return merged;
}

/** Runtime view: file config with env overrides applied. Does not mutate `fileConfig`. */
export function applyEnvOverrides(
  fileConfig: ServerConfigData,
  overrides: EnvOverrides,
): ServerConfigData {
  const directories = mergeDirs(fileConfig.directories, overrides.directories);
  return {
    ...fileConfig,
    port: overrides.port ?? fileConfig.port,
    token: overrides.token ?? fileConfig.token,
    directories,
    tabletopDirectories: mergeDirs(fileConfig.tabletopDirectories, overrides.tabletopDirectories),
    downloadDir: fileConfig.downloadDir || directories[0] || null,
  };
}

/**
 * Removes values from the file config that are identical to an env override. Such values can only
 * have been written by the old ConfigManager, which persisted env overrides into config.json (#409).
 * Values that differ from the env are kept — they may be intentional.
 */
export function stripLeakedEnvValues(
  fileConfig: ServerConfigData,
  overrides: EnvOverrides,
  defaultPort: number,
): { config: ServerConfigData; dropped: string[] } {
  const config: ServerConfigData = {
    ...fileConfig,
    directories: [...fileConfig.directories],
    tabletopDirectories: [...fileConfig.tabletopDirectories],
  };
  const dropped: string[] = [];

  if (overrides.token && config.token === overrides.token) {
    config.token = null;
    dropped.push('token');
  }
  if (overrides.port !== null && config.port === overrides.port && overrides.port !== defaultPort) {
    config.port = defaultPort;
    dropped.push('port');
  }

  const isEnvDir = (dir: string) => overrides.directories.some((envDir) => sameDir(envDir, dir));
  const keptDirs = config.directories.filter((dir) => !isEnvDir(dir));
  if (keptDirs.length !== config.directories.length) {
    config.directories = keptDirs;
    dropped.push('directories');
  }
  if (config.downloadDir && isEnvDir(config.downloadDir)) {
    config.downloadDir = null;
    dropped.push('downloadDir');
  }

  const keptTabletop = config.tabletopDirectories.filter(
    (dir) => !overrides.tabletopDirectories.some((envDir) => sameDir(envDir, dir)),
  );
  if (keptTabletop.length !== config.tabletopDirectories.length) {
    config.tabletopDirectories = keptTabletop;
    dropped.push('tabletopDirectories');
  }

  return { config, dropped };
}
