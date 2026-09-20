import fs from 'node:fs';
import path from 'node:path';
import type { Playlist } from '../../../core/types';

let playlistsFile = path.join(process.cwd(), 'playlists.json');
let currentPlaylists: Playlist[] = [];

function loadPlaylists(): void {
  const explicitConfigDir = process.env.CONFIG_PATH
    ? path.dirname(path.resolve(process.env.CONFIG_PATH))
    : null;

  const searchPaths = [
    ...(explicitConfigDir ? [explicitConfigDir] : []),
    '/app/config',
    process.cwd(),
    path.dirname(process.execPath),
    path.resolve(path.dirname(process.execPath), '..'),
  ];

  const uniquePaths = [...new Set(searchPaths)];
  let foundPlaylists: string | null = null;

  for (const searchDir of uniquePaths) {
    const p = path.join(searchDir, 'playlists.json');
    if (fs.existsSync(p)) {
      console.log(`[Playlists] Found playlists at: ${p}`);
      playlistsFile = p;
      foundPlaylists = p;
      break;
    }
  }

  if (foundPlaylists) {
    try {
      const fileContent = fs.readFileSync(foundPlaylists, 'utf-8');
      const parsed = JSON.parse(fileContent);
      currentPlaylists = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error(`[Playlists] Failed to parse playlists at ${foundPlaylists}:`, e);
      currentPlaylists = [];
    }
  } else {
    if (explicitConfigDir && fs.existsSync(explicitConfigDir)) {
      playlistsFile = path.join(explicitConfigDir, 'playlists.json');
    } else if (fs.existsSync('/app/config') && fs.statSync('/app/config').isDirectory()) {
      playlistsFile = '/app/config/playlists.json';
    } else {
      playlistsFile = path.join(process.cwd(), 'playlists.json');
    }
    console.log(`[Playlists] Using playlists location: ${playlistsFile}`);
  }
}

function savePlaylists(): void {
  try {
    const parentDir = path.dirname(playlistsFile);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(playlistsFile, JSON.stringify(currentPlaylists, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Playlists] Failed to save playlists:', e);
  }
}

// Initial load
loadPlaylists();

export const getAllPlaylists = (): Playlist[] => {
  return currentPlaylists;
};

export const savePlaylist = (playlist: Playlist): Playlist => {
  const index = currentPlaylists.findIndex((p) => p.id === playlist.id);
  if (index > -1) {
    currentPlaylists[index] = playlist;
  } else {
    currentPlaylists.push(playlist);
  }
  savePlaylists();
  return playlist;
};

export const deletePlaylist = (id: string): boolean => {
  const index = currentPlaylists.findIndex((p) => p.id === id);
  if (index > -1) {
    currentPlaylists.splice(index, 1);
    savePlaylists();
    return true;
  }
  return false;
};
